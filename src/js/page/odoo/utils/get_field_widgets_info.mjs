// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export type FieldWidgetInfo = {name: string, label: string, type: string, required: boolean};

// Metadata (label, widget type, required flag) for every Odoo form field currently rendered
// under `root` — shared by the `inspect -e field` command and the AI pet's guardian consult,
// so both reason about the same notion of "what fields exist and which are required".
export default function getFieldWidgetsInfo(root: Element): $ReadOnlyArray<FieldWidgetInfo> {
  // $FlowFixMe[prop-missing]
  const els: $ReadOnlyArray<Element> = Array.from(root.querySelectorAll('.o_field_widget[name]'));
  const seenNames: Set<string> = new Set();
  const result: Array<FieldWidgetInfo> = [];
  for (const el of els) {
    const name = el.getAttribute('name') ?? '';
    if (name.length === 0 || seenNames.has(name)) {
      continue;
    }
    seenNames.add(name);
    const typeClass = Array.from(el.classList).find(c => c.startsWith('o_field_') && c !== 'o_field_widget') ?? '';
    const ftype = typeClass.length > 0 ? typeClass.slice('o_field_'.length) : 'unknown';
    const required = el.closest('.o_required_modifier') !== null || el.getAttribute('aria-required') === 'true';

    let label = '';
    // $FlowFixMe[prop-missing]
    const labelEl = document.querySelector(`.o_form_label[for="${name}"], label[for="${name}"]`);
    if (labelEl !== null && typeof labelEl !== 'undefined') {
      label = (labelEl.textContent ?? '').trim();
    }
    if (label.length === 0) {
      const row = el.closest('.o_wrap_field, tr');
      if (row !== null && typeof row !== 'undefined') {
        // $FlowFixMe[prop-missing]
        const labelCell = row.querySelector('.o_form_label, .o_td_label label');
        if (labelCell !== null && typeof labelCell !== 'undefined') {
          label = (labelCell.textContent ?? '').trim();
        }
      }
    }

    result.push({name, label, type: ftype, required});
  }
  return result;
}
