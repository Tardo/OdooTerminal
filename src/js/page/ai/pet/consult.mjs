// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// The guardian's one-shot Q&A: no tool calls, no run_command — it can only see a data
// snapshot, never act on it. That's deliberate: a full agent run can fire view/click/form-edit,
// which would repaint the user's screen mid-edit if triggered automatically in the background.
// Plain chat + a local snapshot gives it real data to judge without that power.
//
// Speed: this fires on every save/open, so it's tuned to be the fastest possible call rather
// than the most thorough one.
// - GUARDIAN_MAX_TOKENS hard-caps generation length via the API param — output length is what
//   actually bounds latency for local inference (decode is the slow, serial part; prompt
//   prefill is comparatively cheap and parallel). A prompt instruction alone ("one sentence")
//   is a suggestion the model can ignore; max_tokens is enforced regardless of what it decides
//   to say, and also protects against a wandering/looping local model burning the whole context.
// - The data snapshot sent as input is still capped (MAX_FIELDS, MAX_ROWS, *_CHARS below), but
//   only as a ceiling against pathological cases, not as a speed lever — see the comment above
//   MAX_ROWS for why (prefill is cheap; the caps were tightened once for latency and that
//   degraded verdict quality by hiding data, so they're deliberately generous now).
// - `reasoning` (from Options → Guardian Pet, or "ai pet -r <level>") lets a "thinking" local
//   model be told to skip/limit its chain-of-thought instead of spending GUARDIAN_MAX_TOKENS on
//   it before ever emitting a verdict — see providers/openai.mjs reasoningEffort.

import {streamRequest} from '@ai/providers';
import {startRequest} from '@ai/utils/network';
import getFormRecord from '@odoo/utils/get_form_record';
import getFieldWidgetsInfo from '@odoo/utils/get_field_widgets_info';
import formatFieldValue from '@odoo/utils/format_field_value';
import logger from '@common/logger';
import type {PetStimulus} from './stimuli';

export type GuardianConnection = {url: string, apiKey: ?string, provider: ?string, maxTokens: ?number};

// The model must reply with exactly this word (case-insensitive) when it has nothing concrete
// to flag. runGuardianConsult() collapses that to '' so the caller can stay fully silent —
// no bubble, no peek — rather than surfacing a manufactured "looks fine!" filler message.
const NOTHING_TOKEN = 'NONE';

// A tight cap (e.g. 96) sounds fast but backfires on any model that writes so much as a short
// preamble, or a "thinking" model that reasons before answering (common on local llama.cpp
// builds): it gets hard-cut before ever emitting the actual verdict, so the pet shows NOTHING —
// worse than being slightly slower. 256 gives real headroom while still being ~16x smaller than
// the general-purpose default (4000), which is sized for full agent/chat replies, not a
// one-line verdict — deliberately NOT reusing connection.maxTokens, see file header.
const GUARDIAN_MAX_TOKENS = 256;

const GUARDIAN_SYSTEM_PROMPT =
  'You are a guardian watching an Odoo form. Answer directly: no chain-of-thought, no <think> blocks, no ' +
  'restating the task, no small talk, greetings, praise, or generic encouragement ("looks good!", "keep it up!", ' +
  '"make sure everything is correct") — go straight to the verdict. You are given: what the user just did, any ' +
  'required fields that are currently empty, the visible fields (type/required/value), and any visible list/line ' +
  'rows (e.g. order lines) with their column values.\n' +
  'Priority order (most valuable first):\n' +
  '1) A required field is empty — name it by its label.\n' +
  '2) A value (field or row) that is WRONG on its own terms: implausibly large or suspiciously round for what it ' +
  'is (e.g. a quantity/amount like 99999, 100000 — almost always a typo), a negative where that makes no sense, a ' +
  'percentage outside 0-100. Name the exact field/column and the value.\n' +
  '3) A value inconsistent with the OTHER fields/rows shown (dates out of order, a total not matching the line ' +
  'amounts, a state contradicting a date/amount).\n' +
  '4) A concrete ERP gap inferable from the labels/values alone (e.g. a contact with no email/phone).\n' +
  'Only report something you can point at specific named field(s)/row(s) for. ' +
  `Nothing fits? Reply with EXACTLY the word ${NOTHING_TOKEN}, nothing else — no punctuation, no reassurance. ` +
  'Otherwise: ONE sentence, under 20 words, plain text, no markdown/HTML, naming the specific field(s)/row(s). Be ' +
  'terse — every extra word costs response time. Never invent data you were not given.';

// Belt-and-suspenders for "thinking" models that emit reasoning regardless of the instruction
// above: strip it so it never leaks into the bubble, and so a truncated (still-open, cut off by
// GUARDIAN_MAX_TOKENS) <think> block collapses to '' instead of showing raw reasoning text.
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
// decode (see GUARDIAN_MAX_TOKENS above) — trimming the input barely moves latency but silently
// hiding a row/value from the model directly degrades the verdict (e.g. a bad value past row 12
// used to be invisible to it). Kept as a ceiling only against a genuinely pathological case (a
// huge memo field, hundreds of rows), not as a latency lever — don't tighten these to speed
// things up, that's the wrong lever (see file header). See runGuardianConsult's truncation log.
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
    if (f.required && isFieldEmpty(raw, f.type)) {
      missingRequiredLabels.push(f.label || f.name);
    }
    if (rows.length < MAX_FIELDS) {
      const formatted = formatFieldValue(raw);
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

// `connection` is resolved by the caller (terminal.mjs #resolvePetConnection): either the
// user's dedicated pet provider (Options → Guardian Pet) or, failing that, whatever connection
// is currently active for manual chat/agent use. Passed explicitly (not read from the global
// aiState) so a pet consult can safely use a DIFFERENT provider without racing a concurrent
// manual chat/agent call that reads the same global.
export async function runGuardianConsult(
  stim: PetStimulus,
  connection: GuardianConnection,
  model: string,
  timeoutSecs: ?number,
  // 'off'/'low'/'medium'/'high', or null to send no override. See Options → Guardian Pet.
  // Openai-provider only (see providers/openai.mjs) — a no-op on other providers for now.
  reasoning?: ?string,
): Promise<string> {
  const snapshot = buildSnapshot();
  const rowsSnapshot = buildRowsSnapshot();
  let userContent = stim.type === 'save' ? `The user just saved: ${stim.label}.` : `The user just opened: ${stim.label}.`;
  if (snapshot.missingRequiredLabels.length > 0) {
    userContent += `\nRequired fields currently empty: ${snapshot.missingRequiredLabels.join(', ')}.`;
  }
  if (snapshot.text.length > 0) {
    userContent += `\nVisible fields (field, type, required, value): ${snapshot.text}`;
  }
  if (rowsSnapshot.rows.length > 0) {
    userContent += `\nVisible list/line rows (each object is one row's column values): ${JSON.stringify(rowsSnapshot.rows)}`;
  }

  // So a "the pet missed/misjudged something" report is diagnosable instead of guessed at: this
  // fires whenever the snapshot sent to the model was NOT the full picture, regardless of whether
  // the consult otherwise succeeded.
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
    logger.warn('pet', `guardian snapshot was truncated, model did not see the full picture: ${truncationNotes.join(', ')}`);
  }

  // Respect a stricter provider-configured ceiling (some constrained local setups cap lower),
  // but never go above GUARDIAN_MAX_TOKENS — the provider's general-purpose default (sized for
  // full chat/agent replies) would undo the whole point of capping this call.
  const maxTokens =
    connection.maxTokens !== null && connection.maxTokens !== undefined && connection.maxTokens > 0
      ? Math.min(connection.maxTokens, GUARDIAN_MAX_TOKENS)
      : GUARDIAN_MAX_TOKENS;

  const controller = startRequest(timeoutSecs);
  let text = '';
  const result = await streamRequest(
    connection.url,
    connection.apiKey,
    model,
    [
      {role: 'system', content: GUARDIAN_SYSTEM_PROMPT},
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
  // Every outcome gets exactly one console line, so "the pet said nothing" is never ambiguous
  // between "model explicitly found nothing to flag" (working as intended — e.g. opening an
  // already-clean record), "reasoning ate the whole budget" (fixable: Reasoning → Off / bigger
  // GUARDIAN_MAX_TOKENS), and "empty answer, no reasoning detected" (something else — check
  // maxTokens/model behavior for this connection) — without this, all three look identical
  // (silent bubble) from the outside.
  if (stripped.toUpperCase() === NOTHING_TOKEN) {
    logger.info('pet', `guardian: explicit ${NOTHING_TOKEN} on this ${stim.type} — nothing to flag, staying silent by design`);
    return '';
  }
  if (stripped.length === 0) {
    if ((result.reasoning ?? '').length > 0 || /<think>/i.test(text)) {
      logger.warn(
        'pet',
        `guardian consult produced reasoning but no visible answer (maxTokens=${maxTokens}, reasoningChars=${(result.reasoning ?? text).length}) — try Options → Guardian Pet → Reasoning: Off, or a non-thinking model for this slot`,
      );
    } else {
      logger.warn('pet', `guardian consult returned an empty answer with no detected reasoning (maxTokens=${maxTokens}) — check the connection/model for this slot`);
    }
    return '';
  }
  logger.info('pet', `guardian: verdict shown on this ${stim.type} (${stripped.length} chars)`);
  return stripped;
}
