// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// Version-agnostic page "stimuli" for the AI watchdog: local heuristics only, no AI calls here.
// - save: any successful write/create through the standard /web/dataset/call_kw/<model>/<method>
//   route. That route shape is shared by every supported Odoo version (11-19), legacy widgets
//   and OWL alike, so we sniff the URL instead of chasing per-version RPC service internals.
// - delete: same route/sniffing, `unlink` method. A watchdog that never reacts to a deletion is
//   an odd watchdog — this is isolated (see consult.mjs), the record is gone by the time it'd
//   fire, so the breadcrumb (still whatever was showing right before the call) is the only
//   identity hint worth sending, not a snapshot.
// - open: the breadcrumb changes. Breadcrumb DOM is a fact of the page, not a routing detail,
//   so it works whether the version encodes navigation in the URL hash or in pushState.
// - edit: a native `change` on a `.o_field_widget[name]`. `change` only fires once per commit
//   (blur / selection made), never per keystroke, so the DOM already gives us the debounce for
//   free — no extra timer needed. Fires the same way inside a one2many/many2many list row
//   (`.o_data_row`) as on a plain form field; the row index goes into the label so the watchdog
//   can tell a line edit from a parent-record edit.
// - hover: the cursor lingers past HOVER_DWELL_MS without a click, over a button, a form field,
//   a field inside a list/o2m row, or a plain list cell value — read as hesitation ("what is
//   this?"/"what does this do?"), not just the mouse passing through on its way somewhere else.
//   The label says which zone it was (see hoverLabel) so the watchdog reacts to the right kind
//   of thing instead of treating every hover like a button. Labels carry the field's own visible
//   label / column header (and required flag) instead of the raw technical field name where
//   possible — a bare name like "partner_id" gives the model (and thus the user) far less to go
//   on than "Customer (required)".
// - notice: Odoo's own notification toast (`.o_notification_manager`) shows a danger/warning
//   message. The exact class Odoo uses for "this is an error" has drifted across 11-19
//   (bg-danger/border-danger/text-bg-danger, ...), so this matches loosely on /danger|warning/i
//   in the element's className rather than pinning one version's exact class.
// - error: two independent sources, both isolated (see consult.mjs) since the DOM at the time
//   isn't necessarily trustworthy: (1) the JSON-RPC envelope of a save/delete call_kw response —
//   Odoo returns HTTP 200 even for a logical/business error (ValidationError, UserError, ...), so
//   `res.ok`/xhr 2xx alone (what watchSaves used to check) misses it entirely; the `error.data.
//   {name,message,debug}` shape read here is the same one `core/screen.mjs`'s printError() already
//   relies on for Odoo's own ORM-thrown errors, just read straight off the raw HTTP response
//   instead of after Odoo's JS has normalized it. (2) uncaught JS exceptions/unhandled promise
//   rejections anywhere on the page (window 'error'/'unhandledrejection') — a different failure
//   class (a broken widget, not a rejected write), but still "an exception", per the request that
//   added this stimulus type. `detail` (traceback/stack, capped) rides separately from the short
//   `label` so consult.mjs can send it as extra technical context without bloating the label used
//   elsewhere (e.g. the history bubble).

export type WatchdogStimulus = {
  type: 'save' | 'delete' | 'open' | 'edit' | 'hover' | 'notice' | 'error',
  label: string,
  detail?: string,
};

// write/create/web_save cover a save (Odoo <=16 direct write/create, Odoo 17+ unified web_save);
// unlink is a deletion — kept in the same regex/group since it's the same route shape, split
// into 'save' vs 'delete' stimuli by the caller based on which method matched (see watchSaves).
// Exported so scripts/check_watchdog_stimuli_regex.mjs can pin this contract down without a browser.
export const CALL_KW_RE: RegExp = /\/web\/dataset\/call_kw\/([^/]+)\/(write|create|web_save|unlink)\b/;
const BREADCRUMB_SELECTOR = '.o_breadcrumb .breadcrumb-item, .o_breadcrumb span';

// Shared by watchSaves() (record identity on save/delete) and watchNavigation() (the 'open'
// stimulus itself) — reading it synchronously at save/delete time needs no debounce, unlike
// watchNavigation's own MutationObserver-driven read.
function currentBreadcrumb(): string {
  if (!document.body) {
    return '';
  }
  // $FlowFixMe[prop-missing]
  const crumbs = document.body.querySelectorAll(BREADCRUMB_SELECTOR);
  return Array.from(crumbs)
    .map(el => (el.textContent ?? '').trim())
    .filter(t => t.length > 0)
    .join(' › ');
}
const NAV_DEBOUNCE_MS = 500;
const EDIT_FIELD_SELECTOR = '.o_field_widget[name]';
// Checked with .closest() in that order of specificity: a field widget nested inside a plain
// `td[name]` (list/o2m cell) matches itself first, so a real field never gets misread as a bare
// "value" cell — td[name] only wins when the cell has no field widget (aggregates, legacy plain
// text columns), same DOM shape buildRowsSnapshot() already reads for list rows.
const HOVER_SELECTOR = 'button, .btn, [role="button"], .o_field_widget[name], td[name]';
// "Lingering" dwell: long enough that a mouse passing through on its way elsewhere doesn't
// count, short enough to still catch a user visibly hesitating over one control.
const HOVER_DWELL_MS = 2500;
const NOTIFICATION_SELECTOR = '.o_notification_manager .o_notification';
// Exported so scripts/check_watchdog_stimuli_regex.mjs can pin this contract down without a browser
// (see CALL_KW_RE above for why: Flow-typed source can't be node-imported directly).
export const NOTIFICATION_SEVERITY_RE: RegExp = /danger|warning/i;

let installed = false;
let enabled = false;
let handler: WatchdogStimulus => void = () => {
  // No-op until the terminal wires a real handler via setWatchdogStimulusHandler.
};

function notify(stim: WatchdogStimulus) {
  if (enabled) {
    handler(stim);
  }
}

// Odoo's own class path (e.g. "odoo.exceptions.ValidationError") is noisier than useful in a
// one-line label — only the module-path prefix is trimmed, the exception class name itself stays.
function shortExcName(name: string): string {
  const parts = name.split('.');
  return parts[parts.length - 1] || name;
}

// A Python traceback reads bottom-up — the line that actually names the raised exception is the
// LAST one — so truncating one must keep the TAIL, unlike a JS stack (thrown-from frame first),
// which must keep the HEAD. Getting these backwards silently cuts the one line that explains
// anything. Pinned in scripts/check_watchdog_stimuli_regex.mjs — keep both in sync on edits.
function truncateTail(str: string, max: number): string {
  return str.length > max ? `…${str.slice(-max)}` : str;
}
function truncateHead(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

// Generous, not tuned for speed — same "prefill is cheap, don't hide data from the model"
// rationale as consult.mjs's MAX_ROWS/MAX_FIELDS (see that file's header comment).
const MAX_ERROR_DEBUG_CHARS = 4000;
const MAX_JS_STACK_CHARS = 2000;

function notifyCallKw(model: string, method: string) {
  const bc = currentBreadcrumb();
  const label = bc.length > 0 ? `${model} · ${method} — ${bc}` : `${model} · ${method}`;
  notify({type: method === 'unlink' ? 'delete' : 'save', label});
}

// `error` is whatever JSON.parse found at the RPC envelope's `.error` key — untyped (`mixed`) on
// purpose, this is untrusted network data, not a value this file controls the shape of. Same
// `data.{name,message,debug}` shape `core/screen.mjs`'s printError() already relies on for Odoo's
// own ORM-thrown errors (that one gets it pre-normalized by Odoo's JS; this reads it straight off
// the raw HTTP response instead, since watchSaves patches window.fetch/XHR directly).
function notifyCallKwError(model: string, method: string, error: mixed, httpStatus: number) {
  // $FlowFixMe[incompatible-use]
  const data = error !== null && typeof error === 'object' ? error.data : null;
  const rawName = data !== null && typeof data === 'object' && typeof data.name === 'string' ? data.name : '';
  const name = rawName.length > 0 ? shortExcName(rawName) : `HTTP ${httpStatus}`;
  const rawMessage = data !== null && typeof data === 'object' && typeof data.message === 'string' ? data.message : '';
  // $FlowFixMe[incompatible-use]
  const fallbackMessage = error !== null && typeof error === 'object' && typeof error.message === 'string' ? error.message : '';
  const message = rawMessage.length > 0 ? rawMessage : fallbackMessage.length > 0 ? fallbackMessage : 'Unknown error';
  const debug = data !== null && typeof data === 'object' && typeof data.debug === 'string' ? data.debug : '';
  notify({
    type: 'error',
    label: `${model} · ${method}: ${name} — ${message}`,
    detail: debug.length > 0 ? truncateTail(debug, MAX_ERROR_DEBUG_CHARS) : undefined,
  });
}

// ponytail: no size cap on the response body before parsing it (write/create/web_save/unlink
// responses are typically small; only web_save echoes back the saved record). Add one if a
// pathological case (huge binary field in a web_save response) shows up in practice.
function handleCallKwOutcome(model: string, method: string, ok: boolean, httpStatus: number, body: mixed) {
  // $FlowFixMe[incompatible-use]
  const error = body !== null && typeof body === 'object' ? body.error : null;
  if (ok && (error === null || typeof error === 'undefined')) {
    notifyCallKw(model, method);
    return;
  }
  notifyCallKwError(model, method, error, httpStatus);
}

function watchSaves() {
  const origFetch = window.fetch;
  // $FlowFixMe[cannot-write]
  window.fetch = function (this: mixed, ...args: Array<mixed>): Promise<Response> {
    const input = args[0];
    // $FlowFixMe[incompatible-use]
    const url = typeof input === 'string' ? input : (input?.url ?? '');
    const match = CALL_KW_RE.exec(String(url));
    // $FlowFixMe[incompatible-call]
    const result = origFetch.apply(this, args);
    if (match) {
      result
        .then(res => {
          if (!res) {
            return;
          }
          // Odoo returns HTTP 200 even for a logical/business error (see file header) — the body
          // must be inspected regardless of res.ok. Cloned so Odoo's own code (which reads this
          // same Response right after, in its own separately-attached .then) still gets an
          // unconsumed stream; see handleCallKwOutcome. clone() itself (not just .json()) can
          // throw synchronously — "body already used" — if anything between origFetch resolving
          // and this handler running already consumed the stream (a shim/polyfill on some
          // version); that throw happens BEFORE the .catch() below is attached, so it would
          // otherwise become an unhandled rejection on every matched call — guarded explicitly.
          let cloned;
          try {
            cloned = res.clone();
          } catch (_e) {
            handleCallKwOutcome(match[1], match[2], res.ok, res.status, null);
            return;
          }
          cloned
            .json()
            .then(body => handleCallKwOutcome(match[1], match[2], res.ok, res.status, body))
            .catch(() => {
              // Not JSON (or empty body) — fall back to the HTTP-level signal only.
              handleCallKwOutcome(match[1], match[2], res.ok, res.status, null);
            });
        })
        .catch(() => {
          // Ignore: network errors are not a "save"/"delete"/"error" stimulus
        });
    }
    return result;
  };

  // $FlowFixMe[method-unbinding]
  const origOpen = XMLHttpRequest.prototype.open;
  // $FlowFixMe[method-unbinding]
  const origSend = XMLHttpRequest.prototype.send;
  // $FlowFixMe[cannot-write]
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string,
    ...rest: Array<mixed>
  ): mixed {
    // $FlowFixMe[prop-missing]
    this.__watchdogUrl = url;
    // $FlowFixMe[incompatible-call]
    return origOpen.call(this, method, url, ...rest);
  };
  // $FlowFixMe[cannot-write]
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: Array<mixed>): mixed {
    // $FlowFixMe[prop-missing]
    const match = CALL_KW_RE.exec(String(this.__watchdogUrl ?? ''));
    if (match) {
      this.addEventListener('load', () => {
        let body = null;
        try {
          body = JSON.parse(this.responseText);
        } catch (_e) {
          // Not JSON — handleCallKwOutcome falls back to the HTTP-level signal only.
        }
        handleCallKwOutcome(match[1], match[2], this.status >= 200 && this.status < 300, this.status, body);
      });
    }
    // $FlowFixMe[incompatible-call]
    return origSend.apply(this, args);
  };
}

// A single hop's own message, duck-typed rather than requiring `instanceof Error`: OWL can wrap a
// plain Odoo RPC error object as a `.cause` (the same {message, data:{name,message,debug}} shape
// notifyCallKwError() above already knows how to read — not a real Error instance), and
// `instanceof Error` also fails across a realm boundary (an iframe, a separately-bundled OWL
// runtime) even for a genuine Error. Prefer the RPC-shaped `data.name: data.message` form when
// present, since it's more specific than the generic wrapper `.message` sitting next to it. Also
// handles a bare primitive `.cause` (a plain `throw "some string"` — careless but real code does
// this, and OWL wraps whatever was actually thrown) instead of silently contributing nothing.
function hopMessage(value: mixed): string {
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
  // $FlowFixMe[prop-missing]
  const data = value.data;
  const dataMessage = data !== null && typeof data === 'object' && typeof data.message === 'string' ? data.message : '';
  const dataName = data !== null && typeof data === 'object' && typeof data.name === 'string' ? data.name : '';
  if (dataMessage.length > 0) {
    return dataName.length > 0 ? `${dataName}: ${dataMessage}` : dataMessage;
  }
  // $FlowFixMe[prop-missing]
  return typeof value.message === 'string' ? value.message : '';
}
function hopStack(value: mixed): string {
  // $FlowFixMe[prop-missing]
  return value !== null && typeof value === 'object' && typeof value.stack === 'string' ? value.stack : '';
}
function hopCause(value: mixed): mixed {
  // $FlowFixMe[prop-missing]
  return value !== null && typeof value === 'object' ? value.cause : undefined;
}

// OWL (Odoo's component framework) wraps a real component-rendering failure in a generic outer
// Error whose own message is a fixed, useless string — literally "...(see this Error's "cause"
// property)" — with the actual failure one or more levels down in the standard `Error.cause`
// chain (OWL sometimes wraps twice: an inner "component crashed during rendering" around the
// real thrown error, then an outer "error occured in the owl lifecycle" around that). Reading
// only the outer .message/.stack (as this used to) sends the AI nothing but that fixed wrapper
// text — a non-answer indistinguishable from no explanation at all.
//
// Walks the FULL chain and returns every hop's own message (outer→inner, joined by the caller) —
// deliberately NOT just the deepest link: if the walk stops early for any reason (a cause shape
// hopMessage doesn't recognize, a chain longer than MAX_CAUSE_DEPTH, a genuinely circular chain —
// `seen` guards that), the caller still gets everything that WAS read instead of silently falling
// back to only the least informative (outermost) one. `stack` keeps the deepest hop that actually
// had one, since a duck-typed non-Error hop (e.g. a plain RPC error object) won't.
const MAX_CAUSE_DEPTH = 8;
function causeChain(err: mixed): {messages: Array<string>, stack: string} {
  const messages: Array<string> = [];
  let stack = '';
  let current = err;
  const seen: Set<mixed> = new Set();
  // Loop condition only excludes null/undefined — a primitive (bare thrown string/number) is a
  // valid final hop with its own message, just not one that can carry a further .cause; the break
  // below stops the walk there instead of the loop condition silently skipping it before
  // hopMessage ever sees it (an earlier version of this function did exactly that).
  for (let i = 0; i < MAX_CAUSE_DEPTH && current !== null && typeof current !== 'undefined' && !seen.has(current); i += 1) {
    seen.add(current);
    const msg = hopMessage(current);
    if (msg.length > 0) {
      messages.push(msg);
    }
    if (typeof current !== 'object') {
      break;
    }
    const hs = hopStack(current);
    if (hs.length > 0) {
      stack = hs;
    }
    current = hopCause(current);
  }
  return {messages, stack};
}

// Uncaught JS exceptions/unhandled promise rejections anywhere on the page — a different failure
// class from the RPC-level errors above (a broken widget/script, not a rejected write), but still
// "an exception" per the request that added this stimulus type.
// ponytail: no origin filtering (Odoo's own bundle vs. a 3rd-party script both land here
// indistinctly) — add a filter if 3rd-party noise turns out to dominate in practice.
function watchErrors() {
  window.addEventListener('error', ev => {
    const {messages, stack} = causeChain(ev.error);
    const message = messages.length > 0 ? messages.join(' → ') : ev.message || 'Unknown error';
    const where = ev.filename ? ` (${ev.filename}:${ev.lineno})` : '';
    notify({
      type: 'error',
      label: `Uncaught JS error: ${message}${where}`,
      detail: stack.length > 0 ? truncateHead(stack, MAX_JS_STACK_CHARS) : undefined,
    });
  });
  window.addEventListener('unhandledrejection', ev => {
    const reason = ev.reason;
    // An aborted request (the watchdog's own consult timing out, "ai stop", a page navigation
    // cancelling an in-flight fetch, ...) surfaces here as a rejection with this name (same check
    // as @ai/utils/network's handleAbort) — notifying an 'error' stimulus for it would feed the
    // technical profile's own aborted requests back into itself as something to explain.
    if (reason instanceof Error && reason.name === 'AbortError') {
      return;
    }
    const {messages, stack} = causeChain(reason);
    const message = messages.length > 0 ? messages.join(' → ') : String(reason);
    notify({
      type: 'error',
      label: `Unhandled promise rejection: ${message}`,
      detail: stack.length > 0 ? truncateHead(stack, MAX_JS_STACK_CHARS) : undefined,
    });
  });
}

function watchNavigation() {
  let lastLabel = '';
  let timer: TimeoutID | null = null;
  const observer = new MutationObserver(() => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      // $FlowFixMe[prop-missing]
      const crumbs = document.querySelectorAll(BREADCRUMB_SELECTOR);
      const label = Array.from(crumbs)
        .map(el => (el.textContent ?? '').trim())
        .filter(t => t.length > 0)
        .join(' › ');
      if (label.length > 0 && label !== lastLabel) {
        lastLabel = label;
        notify({type: 'open', label});
      }
    }, NAV_DEBOUNCE_MS);
  });
  if (document.body) {
    observer.observe(document.body, {childList: true, subtree: true});
  }
}

function fieldRowIndex(row: Element): number {
  let index = 1;
  let sib = row.previousElementSibling;
  while (sib !== null && typeof sib !== 'undefined') {
    if (sib.classList.contains('o_data_row')) {
      index += 1;
    }
    sib = sib.previousElementSibling;
  }
  return index;
}

function watchEdits() {
  document.addEventListener('change', ev => {
    const target = ev.target;
    if (!(target instanceof Element)) {
      return;
    }
    const fieldEl = target.closest(EDIT_FIELD_SELECTOR);
    if (fieldEl === null || typeof fieldEl === 'undefined') {
      return;
    }
    const name = fieldEl.getAttribute('name') ?? '';
    if (name.length === 0) {
      return;
    }
    const row = fieldEl.closest('.o_data_row');
    notify({
      type: 'edit',
      label: row !== null && typeof row !== 'undefined' ? `row ${fieldRowIndex(row)} · ${name}` : name,
    });
  });
}

// Same lookup `get_field_widgets_info.mjs` uses for a plain form field's visible label — kept
// duplicated here (not imported) so this file stays free of the @odoo dependency graph, matching
// its own "100% local detection" header comment.
function fieldLabel(name: string): string {
  // $FlowFixMe[prop-missing]
  const labelEl = document.querySelector(`.o_form_label[for="${name}"], label[for="${name}"]`);
  return labelEl !== null && typeof labelEl !== 'undefined' ? (labelEl.textContent ?? '').trim() : '';
}

// A list/o2m column's header text (e.g. "Quantity") reads far better to the model than the raw
// technical field name (e.g. "product_uom_qty") — same idea as fieldLabel() above, just for the
// table-header shape list views use instead of a <label for>.
function columnHeader(fieldEl: Element, name: string): string {
  const table = fieldEl.closest('table');
  if (table === null || typeof table === 'undefined') {
    return '';
  }
  // $FlowFixMe[prop-missing]
  const th = table.querySelector(`thead th[data-name="${name}"]`);
  return th !== null && typeof th !== 'undefined' ? (th.textContent ?? '').trim() : '';
}

// Zone-aware label so the watchdog can tell "hovering a button" from "hovering a field" from
// "hovering a field inside a list row" from "hovering a plain value cell" — same `row N · name`
// shape watchEdits() already uses for edits, so the watchdog sees one consistent naming scheme
// across edit and hover stimuli instead of two different ones for the same location. Prefers the
// field's own visible label/column header over its raw technical name wherever one is found —
// asking "what does this do?" about a bare name like "partner_id" is exactly what invites a
// generic/invented answer instead of a real one.
function hoverLabel(el: Element): string {
  const fieldEl = el.closest(EDIT_FIELD_SELECTOR);
  if (fieldEl !== null && typeof fieldEl !== 'undefined') {
    const name = fieldEl.getAttribute('name') ?? '';
    const row = fieldEl.closest('.o_data_row');
    if (row !== null && typeof row !== 'undefined') {
      const header = columnHeader(fieldEl, name);
      return `row ${fieldRowIndex(row)} · ${header.length > 0 ? header : name} field`;
    }
    const required = fieldEl.closest('.o_required_modifier') !== null || fieldEl.getAttribute('aria-required') === 'true';
    const label = fieldLabel(name);
    return `${label.length > 0 ? label : name} field${required ? ' (required)' : ''}`;
  }
  const cellEl = el.closest('td[name]');
  if (cellEl !== null && typeof cellEl !== 'undefined') {
    const name = cellEl.getAttribute('name') ?? '';
    const row = cellEl.closest('.o_data_row');
    const header = columnHeader(cellEl, name);
    const shown = header.length > 0 ? header : name;
    return row !== null && typeof row !== 'undefined' ? `row ${fieldRowIndex(row)} · ${shown} value` : `${shown} value`;
  }
  return (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent ?? '').trim();
}

// mouseenter/mouseleave don't bubble, so this delegates on mouseover/mouseout instead — same
// trick watchNavigation uses for the breadcrumb (observe broadly, filter in the handler).
function watchHover() {
  let hoverEl: Element | null = null;
  let timer: TimeoutID | null = null;

  function clear() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    hoverEl = null;
  }

  document.addEventListener('mouseover', ev => {
    const target = ev.target;
    if (!(target instanceof Element)) {
      return;
    }
    const el = target.closest(HOVER_SELECTOR);
    if (el === null || typeof el === 'undefined' || el === hoverEl) {
      return;
    }
    clear();
    hoverEl = el;
    timer = setTimeout(() => {
      const label = hoverLabel(el);
      if (label.length > 0) {
        notify({type: 'hover', label});
      }
    }, HOVER_DWELL_MS);
  });

  document.addEventListener('mouseout', ev => {
    // Aliased to a local const: `hoverEl` is reassigned elsewhere (clear(), the mouseover
    // handler above), so Flow won't keep it refined past the null check below unless it's
    // captured in a binding of its own that can't be reassigned.
    const current = hoverEl;
    if (current === null) {
      return;
    }
    const target = ev.target;
    if (!(target instanceof Element) || target.closest(HOVER_SELECTOR) !== current) {
      return;
    }
    const related = ev.relatedTarget;
    if (related instanceof Node && current.contains(related)) {
      return;
    }
    clear();
  });
}

function watchNotifications() {
  const seen: WeakSet<Element> = new WeakSet();
  let timer: TimeoutID | null = null;
  const observer = new MutationObserver(() => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    // Debounced like watchNavigation: without it, this querySelectorAll would re-run on every
    // single DOM mutation for the whole time the watchdog is enabled, not just when a toast lands.
    timer = setTimeout(() => {
      // $FlowFixMe[prop-missing]
      const els: $ReadOnlyArray<Element> = Array.from(document.querySelectorAll(NOTIFICATION_SELECTOR));
      for (const el of els) {
        if (seen.has(el)) {
          continue;
        }
        seen.add(el);
        if (!NOTIFICATION_SEVERITY_RE.test(el.className)) {
          continue;
        }
        const text = (el.textContent ?? '').trim();
        if (text.length > 0) {
          notify({type: 'notice', label: text});
        }
      }
    }, NAV_DEBOUNCE_MS);
  });
  if (document.body) {
    observer.observe(document.body, {childList: true, subtree: true});
  }
}

export function setWatchdogStimulusHandler(next: WatchdogStimulus => void) {
  handler = next;
}

// Idempotent: patches are installed once on first enable and left in place;
// later calls just flip whether `notify` forwards events.
export function setWatchdogStimulusEnabled(next: boolean) {
  enabled = next;
  if (next && !installed) {
    installed = true;
    watchSaves();
    watchNavigation();
    watchEdits();
    watchHover();
    watchNotifications();
    watchErrors();
  }
}
