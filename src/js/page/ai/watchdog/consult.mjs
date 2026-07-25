// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// The watchdog's one-shot Q&A: no tool calls, no run_command — it can only see a data
// snapshot, never act on it. That's deliberate: a full agent run can fire view/click/form-edit,
// which would repaint the user's screen mid-edit if triggered automatically in the background.
// Plain chat + a local snapshot gives it real data to judge without that power.
//
// Speed: this fires on every save/open, so it's tuned to be the fastest possible call rather
// than the most thorough one.
// - WATCHDOG_MAX_TOKENS hard-caps generation length via the API param — output length is what
//   actually bounds latency for local inference (decode is the slow, serial part; prompt
//   prefill is comparatively cheap and parallel). A prompt instruction alone ("one sentence")
//   is a suggestion the model can ignore; max_tokens is enforced regardless of what it decides
//   to say, and also protects against a wandering/looping local model burning the whole context.
// - The data snapshot sent as input is still capped (MAX_FIELDS, MAX_ROWS, *_CHARS below), but
//   only as a ceiling against pathological cases, not as a speed lever — see the comment above
//   MAX_ROWS for why (prefill is cheap; the caps were tightened once for latency and that
//   degraded verdict quality by hiding data, so they're deliberately generous now).
// - `reasoning` (from Options → AI Watchdog, or "watchdog -r <level>") lets a "thinking" local
//   model be told to skip/limit its chain-of-thought instead of spending WATCHDOG_MAX_TOKENS on
//   it before ever emitting a verdict — see providers/openai.mjs reasoningEffort.

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

// The model must reply with exactly this word (case-insensitive) when it has nothing concrete
// to flag. runWatchdogConsult() collapses that to '' so the caller can stay fully silent —
// no bubble, no peek — rather than surfacing a manufactured "looks fine!" filler message.
const NOTHING_TOKEN = 'NONE';

// A prompt instruction alone doesn't bind a model's output (same principle as WATCHDOG_MAX_TOKENS
// below, applied to language instead of length): told to "respond in Spanish", a local model may
// translate NOTHING_TOKEN too despite being asked to keep it literal. Same closed language set as
// LANGUAGE_NAMES — checked against the ENTIRE reply so a real verdict that merely mentions one of
// these words is never mistaken for silence.
const NOTHING_WORDS: {[string]: $ReadOnlyArray<string>} = {
  es: ['NINGUNO', 'NINGUNA', 'NADA', 'SIN INCIDENCIAS', 'NINGUNA INCIDENCIA'],
  zh: ['无', '没有'],
};

// A model that decorates the sentinel — "**NONE**", `"NONE"`, a ```NONE``` fence, "[NONE]",
// "NONE," — used to leak the raw decorated text straight into the bubble, because the old
// normalizer only trimmed a handful of trailing sentence-enders. Wrapper characters are stripped
// from BOTH ends only (never the middle, and never more than once per end): this keeps the check
// a strict whole-string equality, so a real verdict that merely STARTS with the English word
// "None" (e.g. "None of the required fields are empty, but the total doesn't match.") can never
// be mistaken for the sentinel — its interior words/spaces survive untouched and the normalized
// string is nowhere near NOTHING_TOKEN. See scripts/check_watchdog_stimuli_regex.mjs for the
// pinned positive/negative cases — keep both in sync on edits.
const WRAPPER_RE = /^[\s"'`*_~«»()[\]{}.,:;!¡?¿。、]+|[\s"'`*_~«»()[\]{}.,:;!¡?¿。、]+$/gu;

function isNothingReply(stripped: string, langCode: string): boolean {
  const normalized = stripped.replace(WRAPPER_RE, '').toUpperCase();
  if (normalized === NOTHING_TOKEN) {
    return true;
  }
  return (NOTHING_WORDS[langCode] ?? []).some(word => normalized === word);
}

// A tight cap (e.g. 96) sounds fast but backfires on any model that writes so much as a short
// preamble, or a "thinking" model that reasons before answering (common on local llama.cpp
// builds): it gets hard-cut before ever emitting the actual verdict, so the watchdog shows
// NOTHING — worse than being slightly slower. 256 gives real headroom while still being ~16x
// smaller than the general-purpose default (4000), which is sized for full agent/chat replies,
// not a one-line verdict — deliberately NOT reusing connection.maxTokens, see file header.
const WATCHDOG_MAX_TOKENS = 256;

// Who the watchdog is "for" ('technical' | 'accounting' | 'sales', via Terminal#getWatchdogProfile)
// — changes vocabulary and which kinds of value-level issues (priority 2/4 below) it leans
// towards, but NEVER the shared contract (sentinel, terseness, no-invention, hover/notice
// isolation) — that stays identical across profiles on purpose, see buildWatchdogSystemPrompt: a
// persona that drifted the contract would silently reintroduce the "shows NONE" bug fixed above
// for that profile only. Any unrecognized/unset value falls back to 'technical'.
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

// Belt-and-suspenders for "thinking" models that emit reasoning regardless of the instruction
// above: strip it so it never leaks into the bubble, and so a truncated (still-open, cut off by
// WATCHDOG_MAX_TOKENS) <think> block collapses to '' instead of showing raw reasoning text.
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

// One2many/many2many line editors (order lines, invoice lines, …) are NOT reachable through
// getFormRecord().read() — that only sees the parent record's own fields, not its subrecords'
// values. Odoo renders every list row (standalone list views AND embedded o2m editors) with the
// same `.o_data_row` / `td[name]` markup, so read it straight from the DOM — same technique as
// `inspect -e list`.
//
// These caps (here and MAX_FIELDS/MAX_VALUE_CHARS below) are deliberately generous, NOT tuned
// for speed: prefill (reading the prompt) is cheap and parallel on local inference, unlike
// decode (see WATCHDOG_MAX_TOKENS above) — trimming the input barely moves latency but silently
// hiding a row/value from the model directly degrades the verdict (e.g. a bad value past row 12
// used to be invisible to it). Kept as a ceiling only against a genuinely pathological case (a
// huge memo field, hundreds of rows), not as a latency lever — don't tighten these to speed
// things up, that's the wrong lever (see file header). See runWatchdogConsult's truncation log.
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

// Same field-discovery approach as the `inspect -e record` command: read whatever Odoo form
// fields are currently rendered, not a fixed field list. Required-and-empty fields are flagged
// deterministically here (zero hallucination risk, and computed over ALL fields — only the JSON
// sent to the model is capped/truncated for speed, see MAX_FIELDS/MAX_VALUE_CHARS above).
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
      // Odoo's wire format uses `false` for an empty non-boolean field (see isFieldEmpty above);
      // formatFieldValue() would otherwise stringify that to the literal text "false", which reads
      // to the model as a real value rather than "empty" — unlike list rows, which read blank
      // .textContent straight from the DOM. Without this, an empty field (e.g. a contact's email)
      // is invisible as a gap here even though the exact same emptiness is caught in list view.
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

// `connection` is resolved by the caller (terminal.mjs #resolveWatchdogConnection): either the
// user's dedicated watchdog provider (Options → AI Watchdog) or, failing that, whatever
// connection is currently active for manual chat/agent use. Passed explicitly (not read from the
// global aiState) so a watchdog consult can safely use a DIFFERENT provider without racing a
// concurrent manual chat/agent call that reads the same global.
export async function runWatchdogConsult(
  stim: WatchdogStimulus,
  connection: WatchdogConnection,
  model: string,
  timeoutSecs: ?number,
  // 'off'/'low'/'medium'/'high', or null to send no override. See Options → AI Watchdog.
  // Openai-provider only (see providers/openai.mjs) — a no-op on other providers for now.
  reasoning?: ?string,
  // 'technical' | 'accounting' | 'sales', or null/unset/unrecognized — falls back to 'technical',
  // same permissive-fallback pattern as PROFILE_ROLE/PROFILE_LENS themselves.
  profile?: ?string,
): Promise<string> {
  // hover/notice/error must react to ONLY the stimulus itself (see system prompt above) — a
  // prompt instruction to "ignore this data" is not reliable on the local models this feature
  // targets (see file history: reasoning leaks, NOTHING_TOKEN getting translated despite
  // instructions). Not sending the snapshot at all makes the isolation structural instead of
  // prompt-enforced, and skips the DOM/adapter work for the stimulus types that either fire most
  // often (hover dwell), where the record is already gone by the time this runs (delete), or
  // where the DOM may itself be broken/mid-crash and untrustworthy (error).
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
  // Appended last, not folded into the static system prompt: an instruction near the end of the
  // user turn tends to get more weight than one buried mid-system-prompt. Reads the extension's
  // own configured UI language (falls back to the page/browser locale — see loader.mjs), so it
  // follows whatever the user picked for the rest of the extension's own text.
  const langCode = (i18n.language ?? 'en').split('-')[0];
  const langName = LANGUAGE_NAMES[langCode] ?? langCode;
  userContent += `\nRespond in ${langName} — except if your entire reply is the word ${NOTHING_TOKEN}, keep that exact English word untranslated.`;
  if (stim.type === 'hover') {
    // Repeated here (not just in the system prompt) for the same recency reason as the language
    // line above: last-in-turn instructions get more weight, and this is the one rule most worth
    // a local model actually obeying instead of drifting back to a generic field nitpick.
    userContent += `\nRemember: only react to "${stim.label}" — nothing else, even if something else looks wrong. If you don't know what it is/does, reply ${NOTHING_TOKEN}.`;
  } else if (stim.type === 'error') {
    // Same recency rationale as the hover reminder above — this is the rule most worth a local
    // model actually obeying instead of drifting into a verbatim error/traceback dump.
    userContent += '\nRemember: explain the likely root cause in your own words — do not just repeat the raw error message or paste the traceback back, and do not mention anything unrelated to this error.';
  }

  // So a "the watchdog missed/misjudged something" report is diagnosable instead of guessed at:
  // this fires whenever the snapshot sent to the model was NOT the full picture, regardless of
  // whether the consult otherwise succeeded.
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

  // Respect a stricter provider-configured ceiling (some constrained local setups cap lower),
  // but never go above WATCHDOG_MAX_TOKENS — the provider's general-purpose default (sized for
  // full chat/agent replies) would undo the whole point of capping this call.
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
  // Every outcome gets exactly one console line, so "the watchdog said nothing" is never
  // ambiguous between "model explicitly found nothing to flag" (working as intended — e.g.
  // opening an already-clean record), "reasoning ate the whole budget" (fixable: Reasoning → Off
  // / bigger WATCHDOG_MAX_TOKENS), and "empty answer, no reasoning detected" (something else —
  // check maxTokens/model behavior for this connection) — without this, all three look identical
  // (silent bubble) from the outside.
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
