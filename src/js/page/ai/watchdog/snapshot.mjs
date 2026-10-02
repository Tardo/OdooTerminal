// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getFieldWidgetsInfo from '@odoo/utils/get_field_widgets_info';

const MAX_FIELDS = 80;
const MAX_ROWS = 60;
const MAX_VALUE_CHARS = 300;

function isVisible(el: Element): boolean {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

// Read what is on screen, including uncommitted edits. A parent form's in-memory
// record cannot resolve fields belonging to a dialog or an editable list row.
function visibleValue(el: Element): string {
  const selector = 'input, textarea, select';
  const controls: Array<Element> = (el.matches(selector) ? [el] : Array.from(el.querySelectorAll(selector))).filter(
    isVisible,
  );
  const tags = Array.from(el.querySelectorAll('.o_tag')).filter(isVisible);
  if (tags.length > 0) return tags.map(tag => tag.textContent?.trim() ?? '').join(', ');
  const selectedState = el.querySelector('.o_arrow_button_current, .o_statusbar_status button[aria-checked="true"]');
  if (selectedState) return selectedState.textContent?.trim() ?? '';
  if (controls.length > 0) {
    return controls
      .map(control => {
        if (control instanceof HTMLInputElement) {
          const inputType: string = control.type;
          if (inputType === 'checkbox') return String(control.checked);
          if (inputType === 'radio') return control.checked ? control.value : '';
          if (inputType === 'password' || inputType === 'file' || inputType === 'hidden') return '';
          return control.value;
        }
        if (control instanceof HTMLSelectElement) {
          return Array.from<HTMLOptionElement>(control.selectedOptions)
            .map(option => option.value ? option.text : '')
            .join(', ');
        }
        return control instanceof HTMLTextAreaElement ? control.value : '';
      })
      .filter(value => value.length > 0)
      .join(', ')
      .trim();
  }
  return (el instanceof HTMLElement ? el.innerText : el.textContent ?? '').trim();
}

export type WatchdogSnapshot = {
  fields: Array<{name: string, label: string, type: string, required: boolean, value: string}>,
  rows: Array<{list: string, row: number, values: {[string]: string}}>,
  missingRequiredLabels: Array<string>,
  limitations: Array<string>,
};

export default function buildWatchdogSnapshot(root: Element): WatchdogSnapshot {
  const snapshot: WatchdogSnapshot = {fields: [], rows: [], missingRequiredLabels: [], limitations: []};
  let fieldsDropped = 0;
  let valuesTruncated = 0;
  function cappedValue(el: Element): string {
    const value = visibleValue(el);
    if (value.length <= MAX_VALUE_CHARS) return value;
    valuesTruncated += 1;
    return `${value.slice(0, MAX_VALUE_CHARS)}…`;
  }
  const widgets = Array.from(root.querySelectorAll('.o_field_widget[name]'));
  const labels = Array.from(root.querySelectorAll('label'));
  for (const field of getFieldWidgetsInfo(root)) {
    const el = widgets.find(widget =>
      widget.getAttribute('name') === field.name && widget.closest('.o_data_row') === null && isVisible(widget),
    );
    // Relational lists have their own snapshot; serializing their parent widget
    // would duplicate rows and mix column headings into the field's value.
    if (
      !el || el.matches('input[type="password"], input[type="file"]') ||
      el.querySelector('.o_list_view, .o_list_table, input[type="password"], input[type="file"]')
    ) continue;
    const input = el.matches('input, textarea, select') ? el : el.querySelector('input, textarea, select');
    const labelEl = input?.id ? labels.find(label => label.htmlFor === input.id) : null;
    const label = labelEl?.textContent?.trim() || field.label || field.name;
    const value = cappedValue(el);
    const required = el.closest('.o_required_modifier') !== null || el.getAttribute('aria-required') === 'true';
    if (required && value.length === 0) snapshot.missingRequiredLabels.push(label);
    if (snapshot.fields.length < MAX_FIELDS) {
      snapshot.fields.push({...field, label, required, value});
    } else {
      fieldsDropped += 1;
    }
  }
  const allRows = Array.from(root.querySelectorAll('.o_data_row')).filter(isVisible);
  const tables = Array.from(root.querySelectorAll('table'));
  for (const row of allRows.slice(0, MAX_ROWS)) {
    const table = row.closest('table');
    const list = table?.closest('.o_field_widget[name]')?.getAttribute('name') ??
      `list ${tables.findIndex(el => el === table) + 1}`;
    const values: {[string]: string} = {};
    for (const cell of row.querySelectorAll('td[name]')) {
      if (!isVisible(cell)) continue;
      const name = cell.getAttribute('name') ?? '';
      if (!name) continue;
      const header = Array.from(table?.querySelectorAll('th[data-name]') ?? [])
        .find(th => th.getAttribute('data-name') === name)?.textContent?.trim() ?? '';
      values[header.length > 0 ? `${header} (${name})` : name] = cappedValue(cell);
    }
    if (Object.keys(values).length > 0) {
      const siblings = Array.from(row.parentElement?.children ?? []).filter(el => el.matches('.o_data_row'));
      snapshot.rows.push({list, row: siblings.findIndex(el => el === row) + 1, values});
    }
  }
  if (fieldsDropped > 0) snapshot.limitations.push(`${fieldsDropped} fields omitted`);
  if (allRows.length > MAX_ROWS) snapshot.limitations.push(`${allRows.length - MAX_ROWS} rows omitted`);
  if (valuesTruncated > 0) snapshot.limitations.push(`${valuesTruncated} values truncated`);
  return snapshot;
}
