// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

const FIELD_STYLE_PREFIX = 'oterm-highlight-f-';

// Generator receives the field name and returns the CSS string to inject into <head>.
export type FieldHighlightGenerator = (fieldName: string) => string;

// Registry keyed by the Odoo field type (the part of the widget class after 'o_field_',
// e.g. 'many2one', 'many2many', 'one2many', 'char'). Falls back to 'default'.
export const FIELD_HIGHLIGHT_GENERATORS: {[string]: FieldHighlightGenerator} = {
  default: fieldName => `
    .o_cell:has(.o_field_widget[name="${fieldName}"]), td > .o_field_widget[name="${fieldName}"] {
      border: 3px solid #f0ad4e !important;
      border-radius: 4px !important;
      box-sizing: border-box !important;
      animation: oterm-field-pulse 1s ease-in-out 4 !important;
    }
  `,
};

// Extracts the Odoo field type from the widget element's class list.
// Returns the part after 'o_field_' (e.g. 'many2one'), or 'default' if not found.
function getFieldType(el: Element): string {
  const typeClass = Array.from(el.classList).find(
    cls => cls.startsWith('o_field_') && cls !== 'o_field_widget',
  );
  return typeClass !== undefined ? typeClass.slice('o_field_'.length) : 'default';
}

// Injects a per-field <style> into <head> using the generator registered for the
// detected field type (falls back to 'default'). The <head> injection is immune to
// OWL re-patching the component subtree.
function injectFieldHighlight(fieldName: string, fieldType: string): void {
  const id = `${FIELD_STYLE_PREFIX}${fieldName}`;
  if (document.getElementById(id)) {
    return;
  }
  const generator = FIELD_HIGHLIGHT_GENERATORS[fieldType] ?? FIELD_HIGHLIGHT_GENERATORS.default;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = generator(fieldName);
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

  const fieldType = getFieldType(els[0]);
  injectFieldHighlight(fieldName, fieldType);

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
