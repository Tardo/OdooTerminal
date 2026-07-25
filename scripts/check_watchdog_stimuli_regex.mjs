// Standalone check for the "save"/"delete" and "notice" detectors, plus the NOTHING_TOKEN
// sentinel normalizer, in src/js/page/ai/watchdog/{stimuli,consult}.mjs. Flow-typed source can't
// be `node`-imported directly, so the patterns are duplicated here — keep them in sync.
// Run: node scripts/check_watchdog_stimuli_regex.mjs
import assert from 'node:assert/strict';

const CALL_KW_RE = /\/web\/dataset\/call_kw\/([^/]+)\/(write|create|web_save|unlink)\b/;

const shouldMatch = [
  ['/web/dataset/call_kw/res.partner/write', 'res.partner', 'write'],
  ['/web/dataset/call_kw/res.partner/create', 'res.partner', 'create'],
  // Odoo 17+ form saves go through web_save (unified create+write), not write/create directly.
  ['/web/dataset/call_kw/sale.order/web_save', 'sale.order', 'web_save'],
  ['https://host.example/web/dataset/call_kw/account.move/web_save', 'account.move', 'web_save'],
  // unlink -> the 'delete' stimulus (see notifyCallKw in stimuli.mjs), same route shape.
  ['/web/dataset/call_kw/res.partner/unlink', 'res.partner', 'unlink'],
];
for (const [url, model, method] of shouldMatch) {
  const m = CALL_KW_RE.exec(url);
  assert.ok(m, `expected a match for ${url}`);
  assert.equal(m[1], model, `model for ${url}`);
  assert.equal(m[2], method, `method for ${url}`);
}

const shouldNotMatch = [
  '/web/dataset/call_kw/res.partner/read',
  '/web/dataset/call_kw/res.partner/write_something',
  '/web/dataset/call_kw/res.partner/search_read',
];
for (const url of shouldNotMatch) {
  assert.equal(CALL_KW_RE.exec(url), null, `expected no match for ${url}`);
}

const NOTIFICATION_SEVERITY_RE = /danger|warning/i;

// Real Odoo toast classNames seen across 11-19 (bg-danger on legacy widgets, border-danger/
// text-bg-danger on the OWL notification service) — loose match is deliberate, see stimuli.mjs.
const severityShouldMatch = [
  'o_notification bg-danger',
  'o_notification border-warning show',
  'o_notification text-bg-danger p-2',
];
for (const className of severityShouldMatch) {
  assert.ok(NOTIFICATION_SEVERITY_RE.test(className), `expected a severity match for "${className}"`);
}

const severityShouldNotMatch = ['o_notification bg-success', 'o_notification text-bg-info show', 'o_notification'];
for (const className of severityShouldNotMatch) {
  assert.equal(NOTIFICATION_SEVERITY_RE.test(className), false, `expected no severity match for "${className}"`);
}

// Mirrors consult.mjs's WRAPPER_RE + isNothingReply — pins the "muestra NONE" leak fix: a model
// that decorates the sentinel with markdown/quotes/fences must still collapse to silence, but a
// real verdict that merely starts with the English/Spanish word "None"/"Ninguno" must NOT.
const WRAPPER_RE = /^[\s"'`*_~«»()[\]{}.,:;!¡?¿。、]+|[\s"'`*_~«»()[\]{}.,:;!¡?¿。、]+$/gu;
const NOTHING_TOKEN = 'NONE';
const NOTHING_WORDS = {
  es: ['NINGUNO', 'NINGUNA', 'NADA', 'SIN INCIDENCIAS', 'NINGUNA INCIDENCIA'],
  zh: ['无', '没有'],
};
function isNothingReply(text, langCode) {
  const normalized = text.replace(WRAPPER_RE, '').toUpperCase();
  if (normalized === NOTHING_TOKEN) {
    return true;
  }
  return (NOTHING_WORDS[langCode] ?? []).some(word => normalized === word);
}

const nothingShouldMatch = [
  ['NONE', 'en'],
  ['None.', 'en'],
  ['  none  ', 'en'],
  ['**NONE**', 'en'],
  ['"NONE"', 'en'],
  ['`NONE`', 'en'],
  ['```\nNONE\n```', 'en'],
  ['[NONE]', 'en'],
  ['NONE,', 'en'],
  ['Ninguno.', 'es'],
  ['NADA', 'es'],
  ['**Sin incidencias**', 'es'],
];
for (const [text, lang] of nothingShouldMatch) {
  assert.ok(isNothingReply(text, lang), `expected "${text}" (${lang}) to collapse to silence`);
}

// The bug this guards against: a real verdict that happens to START with "None"/"Ninguno" as an
// ordinary English/Spanish word must NEVER be swallowed as the sentinel.
const nothingShouldNotMatch = [
  ["None of the required fields are empty, but the total doesn't match.", 'en'],
  ['Ningún campo requerido está vacío, pero el total no coincide.', 'es'],
  ['Nada más que añadir sobre el descuento del 150%.', 'es'],
];
for (const [text, lang] of nothingShouldNotMatch) {
  assert.equal(isNothingReply(text, lang), false, `expected "${text}" (${lang}) to NOT collapse to silence`);
}

// Mirrors stimuli.mjs's truncateTail/truncateHead — pins the head-vs-tail direction, which is
// easy to get backwards and silently cuts the one line that actually explains anything: a Python
// traceback reads bottom-up (keep the TAIL), a JS stack reads top-down (keep the HEAD).
function truncateTail(str, max) {
  return str.length > max ? `…${str.slice(-max)}` : str;
}
function truncateHead(str, max) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
assert.equal(truncateTail('abcdefgh', 4), '…efgh', 'truncateTail keeps the end');
assert.equal(truncateHead('abcdefgh', 4), 'abcd…', 'truncateHead keeps the start');
assert.equal(truncateTail('abcd', 4), 'abcd', 'truncateTail is a no-op under the cap');
assert.equal(truncateHead('abcd', 4), 'abcd', 'truncateHead is a no-op under the cap');

// Mirrors stimuli.mjs's causeChain()/hopMessage() — pins the fix for OWL's error wrapping: OWL's
// own outer Error message is a fixed, useless string ("...see this Error's cause property") with
// the real failure one or more Error.cause levels down (OWL sometimes wraps twice). Reading only
// the outer .message used to send the AI that fixed string verbatim — a non-answer
// indistinguishable from no explanation at all (this is the exact bug report that added this
// check). Duck-typed (no `instanceof Error`) since a hop can be a plain Odoo RPC error object.
function hopMessage(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value !== 'object') {
    return '';
  }
  const data = value.data;
  const dataMessage = data !== null && typeof data === 'object' && typeof data.message === 'string' ? data.message : '';
  const dataName = data !== null && typeof data === 'object' && typeof data.name === 'string' ? data.name : '';
  if (dataMessage.length > 0) {
    return dataName.length > 0 ? `${dataName}: ${dataMessage}` : dataMessage;
  }
  return typeof value.message === 'string' ? value.message : '';
}
const MAX_CAUSE_DEPTH = 8;
function causeChain(err) {
  const messages = [];
  let current = err;
  const seen = new Set();
  for (let i = 0; i < MAX_CAUSE_DEPTH && current !== null && typeof current !== 'undefined' && !seen.has(current); i += 1) {
    seen.add(current);
    const msg = hopMessage(current);
    if (msg.length > 0) {
      messages.push(msg);
    }
    if (typeof current !== 'object') {
      break;
    }
    current = current.cause;
  }
  return messages;
}

const root = new Error('Model not found: re.ds');
const mid = new Error('A component crashed during rendering — check the "cause" property of this error for the actual failure.', {cause: root});
const outer = new Error('An error occured in the owl lifecycle (see this Error\'s "cause" property)', {cause: mid});
assert.deepEqual(
  causeChain(outer),
  [
    'An error occured in the owl lifecycle (see this Error\'s "cause" property)',
    'A component crashed during rendering — check the "cause" property of this error for the actual failure.',
    'Model not found: re.ds',
  ],
  'causeChain walks the full nested-OWL-wrapper chain down to the real cause, not just the outer wrapper',
);
assert.deepEqual(causeChain(root), ['Model not found: re.ds'], 'causeChain is a single-element list for an error with no cause');

// A plain Odoo RPC error object (not an Error instance) as a hop must still be read.
const rpcShaped = {message: 'Odoo Server Error', data: {name: 'odoo.exceptions.ValidationError', message: 'The name is required'}};
assert.deepEqual(causeChain(rpcShaped), ['odoo.exceptions.ValidationError: The name is required'], 'causeChain reads RPC-shaped data.name/data.message over the generic wrapper message');

// A bare thrown primitive (careless code does `throw "some string"`) as the final hop must still
// contribute its message instead of being silently dropped (an earlier version of causeChain's
// loop condition excluded non-objects BEFORE calling hopMessage, so this case came back empty).
const bareStringCause = new Error('An error occured in the owl lifecycle (see this Error\'s "cause" property)', {cause: 'Model not found: re.ds'});
assert.deepEqual(
  causeChain(bareStringCause),
  ['An error occured in the owl lifecycle (see this Error\'s "cause" property)', 'Model not found: re.ds'],
  'causeChain reads a bare string .cause as the final hop',
);

// A circular cause chain (malformed, but Error.cause doesn't rule it out) must not hang.
const a = new Error('a');
const b = new Error('b', {cause: a});
a.cause = b;
assert.doesNotThrow(() => causeChain(a));

console.log('watchdog stimuli regex: ok');
