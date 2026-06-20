// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const BASE_STYLE_ID = 'oterm-form-highlight-base';
const FIELD_STYLE_PREFIX = 'oterm-highlight-f-';

function ensureBaseStyle(): void {
  if (document.getElementById(BASE_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = BASE_STYLE_ID;
  style.textContent = `
    @keyframes oterm-field-pulse {
      0%, 100% { border-color: #f0ad4e; }
      50%       { border-color: #e8690b; }
    }
  `;
  document.head?.appendChild(style);
}

// Injects a per-field <style> into <head> that creates a ::before pseudo-element
// overlay on top of the widget's content (z-index: 9999). This sidesteps three
// common failure modes for o2m/m2m fields:
//   - `outline` and `box-shadow` are painted below the widget's own content
//     (sticky table headers, child stacking contexts) and can be invisible.
//   - Odoo may reset `outline: none !important` on field types.
//   - OWL re-patches the component subtree but never touches <head>, so the
//     style tag survives re-renders intact.
function injectFieldHighlight(fieldName: string): void {
  ensureBaseStyle();
  const id = `${FIELD_STYLE_PREFIX}${fieldName}`;
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    .o_field_widget[name="${fieldName}"] {
      position: relative !important;
    }
    .o_field_widget[name="${fieldName}"]::before {
      content: '' !important;
      position: absolute !important;
      inset: 0 !important;
      border: 3px solid #f0ad4e !important;
      border-radius: 4px !important;
      pointer-events: none !important;
      z-index: 9999 !important;
      box-sizing: border-box !important;
      animation: oterm-field-pulse 1s ease-in-out 4 !important;
    }
  `;
  document.head?.appendChild(style);
}

// Walks up the DOM from `el` and clicks the nav tab for every inactive .tab-pane
// ancestor, outermost-first. Used when a field IS in the DOM but its tab has
// been deactivated after a previous visit (OWL keeps it rendered).
// Covers Bootstrap 4 (href="#id") and Bootstrap 5 (data-bs-target="#id").
function activateTabsForElement(el: Element): boolean {
  let activated = false;
  const inactivePanes: Array<Element> = [];
  let cursor = el.parentElement;
  while (cursor !== null && typeof cursor !== 'undefined') {
    if (cursor.classList.contains('tab-pane') && !cursor.classList.contains('active')) {
      inactivePanes.unshift(cursor);
    }
    cursor = cursor.parentElement;
  }
  for (const pane of inactivePanes) {
    const paneId = pane.id;
    if (!paneId) {
      continue;
    }
    // $FlowFixMe[prop-missing]
    const navLink = document.querySelector(`[href="#${paneId}"], [data-bs-target="#${paneId}"]`);
    if (navLink instanceof HTMLElement) {
      navLink.click();
      activated = true;
    }
  }
  return activated;
}

// Activates a stack of notebook pages by their translated label text (outermost
// first). Each click waits for Bootstrap's tab transition before proceeding so
// that nested notebooks are rendered before their inner tab is clicked.
export async function activateNotebookPath(labels: $ReadOnlyArray<string>): Promise<void> {
  for (const label of labels) {
    // $FlowFixMe[prop-missing]
    const navLinks = document.querySelectorAll('.o_notebook .nav-tabs .nav-link');
    for (const link of navLinks) {
      if (link.textContent.trim() === label && !link.classList.contains('active')) {
        if (link instanceof HTMLElement) {
          link.click();
        }
        await new Promise<void>(resolve => setTimeout(resolve, 300));
        break;
      }
    }
  }
}

// Highlights all `.o_field_widget[name="..."]` currently in the DOM via an
// injected <style> tag (immune to OWL re-patching).
// Returns 0 when the field is not in the DOM at all (lazy-rendered tab: caller
// should activate the notebook page first via activateNotebookPath and retry).
export async function highlightFormFields(fieldName: string): Promise<number> {
  // $FlowFixMe[prop-missing]
  const els = document.querySelectorAll(`.o_field_widget[name="${fieldName}"]`);
  const count = els.length;
  if (count === 0) {
    return 0;
  }

  // Handle the case where the field is in the DOM but inside a previously
  // visited tab that is now inactive (OWL keeps rendered tabs in the DOM).
  let tabActivated = false;
  els.forEach(el => {
    if (activateTabsForElement(el)) {
      tabActivated = true;
    }
  });
  if (tabActivated) {
    await new Promise<void>(resolve => setTimeout(resolve, 200));
  }

  injectFieldHighlight(fieldName);

  els[0].scrollIntoView({behavior: 'smooth', block: 'center'});
  return count;
}

export function clearFormFieldHighlights(fieldName: string | void): void {
  if (typeof fieldName === 'string') {
    document.getElementById(`${FIELD_STYLE_PREFIX}${fieldName}`)?.remove();
  } else {
    // $FlowFixMe[prop-missing]
    document
      .querySelectorAll(`[id^="${FIELD_STYLE_PREFIX}"]`)
      .forEach(el => el.remove());
  }
}
