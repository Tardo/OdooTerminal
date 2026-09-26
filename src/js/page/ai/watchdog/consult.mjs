// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

// Read-only snapshot consultation: tool calls could disrupt the user's active form.
// Bound generation with max_tokens; snapshot caps guard against oversized input.

import i18n from 'i18next';
import {streamRequest} from '@ai/providers';
import {startRequest} from '@ai/utils/network';
import getFormRecord from '@odoo/utils/get_form_record';
import getFieldWidgetsInfo from '@odoo/utils/get_field_widgets_info';
import formatFieldValue from '@odoo/utils/format_field_value';
import logger from '@common/logger';
import type {WatchdogStimulus} from './stimuli';

export type WatchdogConnection = {url: string, apiKey: ?string, provider: ?string, maxTokens: ?number};

// Keep in sync with the `supportedLngs` list in page/loader.mjs. Spelled-out names read more
// reliably than raw ISO codes for smaller local models.
const LANGUAGE_NAMES: {[string]: string} = {en: 'English', es: 'Spanish', zh: 'Chinese'};

// A sentinel-only reply produces no bubble.
const NOTHING_TOKEN = 'NONE';

// Models may translate the sentinel despite the prompt; match only the entire reply.
const NOTHING_WORDS: {[string]: $ReadOnlyArray<string>} = {
  es: ['NINGUNO', 'NINGUNA', 'NADA', 'SIN INCIDENCIAS', 'NINGUNA INCIDENCIA'],
  zh: ['无', '没有'],
};

// Strip decorations only at the edges: a sentence starting with "None" is still a verdict.
// Regression cases: src/js/page/tests/test_regressions.mjs.
const WRAPPER_RE = /^[\s"'`*_~«»()[\]{}.,:;!¡?¿。、]+|[\s"'`*_~«»()[\]{}.,:;!¡?¿。、]+$/gu;

export function isNothingReply(stripped: string, langCode: string): boolean {
  const normalized = stripped.replace(WRAPPER_RE, '').toUpperCase();
  if (normalized === NOTHING_TOKEN) {
    return true;
  }
  return (NOTHING_WORDS[langCode] ?? []).some(word => normalized === word);
}

// Leave room for a preamble/reasoning before the verdict, below the general chat budget.
const WATCHDOG_MAX_TOKENS = 256;

// Profiles change vocabulary and priorities; all share the same response contract.
const PROFILE_ROLE: {[string]: string} = {
  technical: 'a technical AI watchdog monitoring an Odoo form for a developer or administrator',
  accounting: 'an accounting-focused AI watchdog monitoring an Odoo form for a bookkeeper or accountant',
  sales: 'a sales-focused AI watchdog monitoring an Odoo form for a salesperson',
};

const PROFILE_LENS: {[string]: string} = {
  technical: 'malformed or implausible values and data-integrity gaps — the kind of thing you would flag in a bug report',
  accounting:
    'amounts, taxes, currencies, due/invoice dates, and totals that do not reconcile with their lines — think like you are about to close the books',
  sales:
    'customer/contact completeness, pricing or discount values that look wrong, and anything that would embarrass a quote or order sent to a customer',
};

function buildWatchdogSystemPrompt(profile: string): string {
  const role = PROFILE_ROLE[profile] ?? PROFILE_ROLE.technical;
  const lens = PROFILE_LENS[profile] ?? PROFILE_LENS.technical;
  return (
    `You are ${role}. Answer directly: no chain-of-thought, no <think> blocks, no restating the task, no small ` +
    'talk, greetings, praise, or generic encouragement ("looks good!", "keep it up!", "make sure everything is ' +
    'correct") — go straight to the verdict. Address the person reading this directly as "you" — never say "the ' +
    'user" or refer to them in the third person. You are given: what they just did, any required fields that are ' +
    'currently empty, the visible fields (type/required/value), and any visible list/line rows (e.g. order lines) ' +
    'with their column values.\n' +
    'If told they are hovering an element without clicking, that Odoo itself just showed them a message, or that ' +
    'an error/exception just occurred: react to ONLY that. For a hover, name what the element does if you ' +
    'actually know from its label/context — never invent it. For an Odoo message, restate what it means for them ' +
    'to do next. For an error/exception, explain the likely root cause in plain terms — do NOT just repeat the ' +
    'raw error message or paste the traceback back at them. Do NOT also mention required fields, wrong values, or ' +
    `anything else in any of these three cases, even if something else looks off — reply ${NOTHING_TOKEN} instead ` +
    'of switching to an unrelated topic. Otherwise (none of the above), go through in order:\n' +
    '1) A required field is empty — name it by its label.\n' +
    `2) A value (field or row) that is WRONG on its own terms, paying particular attention to ${lens}: implausibly ` +
    'large or suspiciously round for what it is (e.g. a quantity/amount like 99999, 100000 — almost always a ' +
    'typo), a negative where that makes no sense, a percentage outside 0-100. Name the exact field/column and the value.\n' +
    '3) A value inconsistent with the OTHER fields/rows shown (dates out of order, a total not matching the line ' +
    'amounts, a state contradicting a date/amount).\n' +
    `4) A concrete gap inferable from the labels/values alone, seen through that same lens (${lens}).\n` +
    'For priorities 1-4, only report something you can point at specific named field(s)/row(s) for. ' +
    `Nothing fits? Reply with EXACTLY the word ${NOTHING_TOKEN}, nothing else — no punctuation, no markdown, no ` +
    'quotes, no code block, no reassurance. ' +
    'Otherwise: ONE sentence, under 20 words, plain text, no markdown/HTML, naming the specific field(s)/row(s)/element. ' +
    'Be terse — every extra word costs response time. Never invent data you were not given.'
  );
}

// Hide reasoning even when the token budget cuts off its closing tag.
function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .trim();
}

// Fields carrying `false` are ambiguous in Odoo's wire format: a genuinely empty many2one/char/
// date reads as `false`, but so does a legitimately unchecked boolean — only the former counts
// as "missing".
function isFieldEmpty(raw: mixed, type: string): boolean {
  if (raw === null || raw === undefined || raw === '') {
    return true;
  }
  if (type !== 'boolean' && raw === false) {
    return true;
  }
  return Array.isArray(raw) && raw.length === 0;
}

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

// Read embedded relational rows from the DOM: getFormRecord().read() only sees the parent.
// Generous snapshot caps preserve useful context; reduce output tokens to tune latency.
const MAX_ROWS = 60;
const MAX_CELL_CHARS = 120;

type RowsSnapshot = {rows: $ReadOnlyArray<{[string]: string}>, rowsDropped: number, cellsTruncated: number};

function buildRowsSnapshot(): RowsSnapshot {
  if (document.body === null) {
    return {rows: [], rowsDropped: 0, cellsTruncated: 0};
  }
  // $FlowFixMe[prop-missing]
  const allRowEls: $ReadOnlyArray<Element> = Array.from(document.body.querySelectorAll('.o_data_row'));
  const rowEls = allRowEls.slice(0, MAX_ROWS);
  let cellsTruncated = 0;
  const rows = rowEls
    .map(row => {
      const cells: {[string]: string} = {};
      // $FlowFixMe[prop-missing]
      row.querySelectorAll('td[name]').forEach(cell => {
        const name = cell.getAttribute('name') ?? '';
        if (name.length > 0) {
          const raw = (cell.textContent ?? '').trim();
          if (raw.length > MAX_CELL_CHARS) {
            cellsTruncated += 1;
          }
          cells[name] = truncate(raw, MAX_CELL_CHARS);
        }
      });
      return cells;
    })
    .filter(cells => Object.keys(cells).length > 0);
  return {rows, rowsDropped: Math.max(0, allRowEls.length - MAX_ROWS), cellsTruncated};
}

type Snapshot = {
  text: string,
  missingRequiredLabels: $ReadOnlyArray<string>,
  fieldsDropped: number,
  valuesTruncated: number,
};

const MAX_FIELDS = 80;
const MAX_VALUE_CHARS = 300;

// Check required fields across the whole form; only the serialized snapshot is capped.
function buildSnapshot(): Snapshot {
  const adapter = getFormRecord();
  if (adapter === null) {
    return {text: '', missingRequiredLabels: [], fieldsDropped: 0, valuesTruncated: 0};
  }
  if (document.body === null) {
    return {text: '', missingRequiredLabels: [], fieldsDropped: 0, valuesTruncated: 0};
  }
  const fieldsInfo = getFieldWidgetsInfo(document.body);
  if (fieldsInfo.length === 0) {
    return {text: '', missingRequiredLabels: [], fieldsDropped: 0, valuesTruncated: 0};
  }
  let values: {[string]: mixed};
  try {
    values = adapter.read(fieldsInfo.map(f => f.name));
  } catch (_e) {
    return {text: '', missingRequiredLabels: [], fieldsDropped: 0, valuesTruncated: 0};
  }
  const missingRequiredLabels: Array<string> = [];
  const rows = [];
  let valuesTruncated = 0;
  for (const f of fieldsInfo) {
    const raw = values[f.name];
    const empty = isFieldEmpty(raw, f.type);
    if (f.required && empty) {
      missingRequiredLabels.push(f.label || f.name);
    }
    if (rows.length < MAX_FIELDS) {
      // Render Odoo's empty non-boolean `false` as blank, not as a literal value.
      const formatted = empty ? '' : formatFieldValue(raw);
      if (formatted.length > MAX_VALUE_CHARS) {
        valuesTruncated += 1;
      }
      rows.push({field: f.label || f.name, type: f.type, required: f.required, value: truncate(formatted, MAX_VALUE_CHARS)});
    }
  }
  return {
    text: JSON.stringify(rows),
    missingRequiredLabels,
    fieldsDropped: Math.max(0, fieldsInfo.length - MAX_FIELDS),
    valuesTruncated,
  };
}

// An explicit connection lets watchdog and manual chat use different providers concurrently.
export async function runWatchdogConsult(
  stim: WatchdogStimulus,
  connection: WatchdogConnection,
  model: string,
  timeoutSecs: ?number,
  // 'off'/'low'/'medium'/'high', or null to send no override. See Options → AI Watchdog.
  // Openai-provider only (see providers/openai.mjs) — a no-op on other providers for now.
  reasoning?: ?string,
  // Unknown profiles fall back to 'technical'.
  profile?: ?string,
): Promise<string> {
  // Omit unrelated form data structurally; prompt instructions alone cannot ensure isolation.
  const isolated = stim.type === 'hover' || stim.type === 'notice' || stim.type === 'delete' || stim.type === 'error';
  const snapshot: Snapshot = isolated ? {text: '', missingRequiredLabels: [], fieldsDropped: 0, valuesTruncated: 0} : buildSnapshot();
  const rowsSnapshot: RowsSnapshot = isolated ? {rows: [], rowsDropped: 0, cellsTruncated: 0} : buildRowsSnapshot();
  let userContent;
  switch (stim.type) {
    case 'save':
      userContent = `You just saved: ${stim.label}.`;
      break;
    case 'delete':
      userContent = `You just deleted: ${stim.label}. The record is gone — do not ask about its field values.`;
      break;
    case 'open':
      userContent = `You just opened: ${stim.label}.`;
      break;
    case 'edit':
      userContent = `You just edited a field: ${stim.label}.`;
      break;
    case 'hover':
      userContent = `You've been hovering over "${stim.label}" for a few seconds without clicking it.`;
      break;
    case 'notice':
      userContent = `Odoo just showed you this message: "${stim.label}".`;
      break;
    case 'error':
      userContent = `An error/exception just occurred: ${stim.label}.`;
      break;
    default:
      userContent = `You just did something: ${stim.label}.`;
  }
  if (typeof stim.detail === 'string' && stim.detail.length > 0) {
    userContent += `\nTechnical detail (traceback/stack, possibly truncated):\n${stim.detail}`;
  }
  if (snapshot.missingRequiredLabels.length > 0) {
    userContent += `\nRequired fields currently empty: ${snapshot.missingRequiredLabels.join(', ')}.`;
  }
  if (snapshot.text.length > 0) {
    userContent += `\nVisible fields (field, type, required, value): ${snapshot.text}`;
  }
  if (rowsSnapshot.rows.length > 0) {
    userContent += `\nVisible list/line rows (each object is one row's column values): ${JSON.stringify(rowsSnapshot.rows)}`;
  }
  // Repeat language and stimulus constraints at the end for models sensitive to recency.
  const langCode = (i18n.language ?? 'en').split('-')[0];
  const langName = LANGUAGE_NAMES[langCode] ?? langCode;
  userContent += `\nRespond in ${langName} — except if your entire reply is the word ${NOTHING_TOKEN}, keep that exact English word untranslated.`;
  if (stim.type === 'hover') {
    userContent += `\nRemember: only react to "${stim.label}" — nothing else, even if something else looks wrong. If you don't know what it is/does, reply ${NOTHING_TOKEN}.`;
  } else if (stim.type === 'error') {
    userContent += '\nRemember: explain the likely root cause in your own words — do not just repeat the raw error message or paste the traceback back, and do not mention anything unrelated to this error.';
  }

  // Log omitted context to make incomplete verdicts diagnosable.
  const truncationNotes = [];
  if (snapshot.fieldsDropped > 0) {
    truncationNotes.push(`${snapshot.fieldsDropped} field(s) dropped (> MAX_FIELDS=${MAX_FIELDS})`);
  }
  if (snapshot.valuesTruncated > 0) {
    truncationNotes.push(`${snapshot.valuesTruncated} value(s) cut short (> MAX_VALUE_CHARS=${MAX_VALUE_CHARS})`);
  }
  if (rowsSnapshot.rowsDropped > 0) {
    truncationNotes.push(`${rowsSnapshot.rowsDropped} row(s) dropped (> MAX_ROWS=${MAX_ROWS})`);
  }
  if (rowsSnapshot.cellsTruncated > 0) {
    truncationNotes.push(`${rowsSnapshot.cellsTruncated} cell(s) cut short (> MAX_CELL_CHARS=${MAX_CELL_CHARS})`);
  }
  if (truncationNotes.length > 0) {
    logger.warn('watchdog', `snapshot was truncated, model did not see the full picture: ${truncationNotes.join(', ')}`);
  }

  // Respect provider limits without exceeding the watchdog's own generation budget.
  const maxTokens =
    connection.maxTokens !== null && connection.maxTokens !== undefined && connection.maxTokens > 0
      ? Math.min(connection.maxTokens, WATCHDOG_MAX_TOKENS)
      : WATCHDOG_MAX_TOKENS;

  const controller = startRequest(timeoutSecs);
  let text = '';
  const result = await streamRequest(
    connection.url,
    connection.apiKey,
    model,
    [
      {role: 'system', content: buildWatchdogSystemPrompt(profile ?? 'technical')},
      {role: 'user', content: userContent},
    ],
    controller.signal,
    delta => {
      text += delta;
    },
    null,
    maxTokens,
    undefined,
    connection.provider,
    reasoning,
  );
  const stripped = stripReasoning(text);
  // Distinguish explicit silence, reasoning-only output, and a genuinely empty response.
  if (isNothingReply(stripped, langCode)) {
    logger.info('watchdog', `explicit ${NOTHING_TOKEN} (or its ${langCode} equivalent) on this ${stim.type} — nothing to flag, staying silent by design`);
    return '';
  }
  if (stripped.length === 0) {
    if ((result.reasoning ?? '').length > 0 || /<think>/i.test(text)) {
      logger.warn(
        'watchdog',
        `consult produced reasoning but no visible answer (maxTokens=${maxTokens}, reasoningChars=${(result.reasoning ?? text).length}) — try Options → AI Watchdog → Reasoning: Off, or a non-thinking model for this slot`,
      );
    } else {
      logger.warn('watchdog', `consult returned an empty answer with no detected reasoning (maxTokens=${maxTokens}) — check the connection/model for this slot`);
    }
    return '';
  }
  logger.info('watchdog', `verdict shown on this ${stim.type} (${stripped.length} chars)`);
  return stripped;
}
