// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// Version-agnostic page "stimuli" for the AI pet: local heuristics only, no AI calls here.
// - save: any successful write/create through the standard /web/dataset/call_kw/<model>/<method>
//   route. That route shape is shared by every supported Odoo version (11-19), legacy widgets
//   and OWL alike, so we sniff the URL instead of chasing per-version RPC service internals.
// - open: the breadcrumb changes. Breadcrumb DOM is a fact of the page, not a routing detail,
//   so it works whether the version encodes navigation in the URL hash or in pushState.

export type PetStimulus = {type: 'save' | 'open', label: string};

// write/create cover Odoo <=16 and any direct ORM call; web_save is the unified create+write
// the form view has called since Odoo 17 — without it, form saves on 17-19 go undetected.
// Exported so scripts/check_pet_stimuli_regex.mjs can pin this contract down without a browser.
export const CALL_KW_RE: RegExp = /\/web\/dataset\/call_kw\/([^/]+)\/(write|create|web_save)\b/;
const BREADCRUMB_SELECTOR = '.o_breadcrumb .breadcrumb-item, .o_breadcrumb span';
const NAV_DEBOUNCE_MS = 500;

let installed = false;
let enabled = false;
let handler: (PetStimulus) => void = () => {
  // No-op until the terminal wires a real handler via setPetStimulusHandler.
};

function notify(stim: PetStimulus) {
  if (enabled) {
    handler(stim);
  }
}

// ponytail: HTTP-level success (res.ok / xhr 2xx) only — does not parse the JSON-RPC
// envelope for a logical {error: ...}. Good enough for a "peek" cue; upgrade if the pet
// needs to react to validation errors specifically.
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
          if (res?.ok) {
            notify({type: 'save', label: `${match[1]} · ${match[2]}`});
          }
        })
        .catch(() => {
          // Ignore: network errors are not a "save" stimulus
        });
    }
    return result;
  };

  // $FlowFixMe[method-unbinding]
  const origOpen = XMLHttpRequest.prototype.open;
  // $FlowFixMe[method-unbinding]
  const origSend = XMLHttpRequest.prototype.send;
  // $FlowFixMe[cannot-write]
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string, ...rest: Array<mixed>): mixed {
    // $FlowFixMe[prop-missing]
    this.__petUrl = url;
    // $FlowFixMe[incompatible-call]
    return origOpen.call(this, method, url, ...rest);
  };
  // $FlowFixMe[cannot-write]
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, ...args: Array<mixed>): mixed {
    // $FlowFixMe[prop-missing]
    const match = CALL_KW_RE.exec(String(this.__petUrl ?? ''));
    if (match) {
      this.addEventListener('load', () => {
        if (this.status >= 200 && this.status < 300) {
          notify({type: 'save', label: `${match[1]} · ${match[2]}`});
        }
      });
    }
    // $FlowFixMe[incompatible-call]
    return origSend.apply(this, args);
  };
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

export function setPetStimulusHandler(next: (PetStimulus) => void) {
  handler = next;
}

// Idempotent: patches are installed once on first enable and left in place;
// later calls just flip whether `notify` forwards events.
export function setPetStimulusEnabled(next: boolean) {
  enabled = next;
  if (next && !installed) {
    installed = true;
    watchSaves();
    watchNavigation();
  }
}
