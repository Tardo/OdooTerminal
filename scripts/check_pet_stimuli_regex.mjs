// Standalone check for the "save" detector in src/js/page/ai/pet/stimuli.mjs.
// Flow-typed source can't be `node`-imported directly, so the pattern is duplicated here —
// keep the two in sync. Run: node scripts/check_pet_stimuli_regex.mjs
import assert from 'node:assert/strict';

const CALL_KW_RE = /\/web\/dataset\/call_kw\/([^/]+)\/(write|create|web_save)\b/;

const shouldMatch = [
  ['/web/dataset/call_kw/res.partner/write', 'res.partner', 'write'],
  ['/web/dataset/call_kw/res.partner/create', 'res.partner', 'create'],
  // Odoo 17+ form saves go through web_save (unified create+write), not write/create directly.
  ['/web/dataset/call_kw/sale.order/web_save', 'sale.order', 'web_save'],
  ['https://host.example/web/dataset/call_kw/account.move/web_save', 'account.move', 'web_save'],
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

console.log('pet stimuli regex: ok');
