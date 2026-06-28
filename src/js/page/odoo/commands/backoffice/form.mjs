// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {highlightFormFields, clearFormFieldHighlights, activateNotebookPath} from '@odoo/utils/highlight_form_field';
import {getFormViewArch, findFieldNotebookPath} from '@odoo/utils/get_form_view_arch';
import getFormRecord from '@odoo/utils/get_form_record';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdForm(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<{[string]: mixed} | void> {
  const operation: mixed = kwargs.operation;
  // -f is ARG.List | ARG.String: always arrives as an array (may be empty/undefined).
  const fieldArg: mixed = kwargs.field;
  const fields: $ReadOnlyArray<string> = Array.isArray(fieldArg)
    ? fieldArg.filter(x => typeof x === 'string')
    : [];
  // For operations that need exactly one field name, take the first element.
  const field: string = fields.length > 0 ? fields[0] : '';

  if (operation === 'get') {
    if (fields.length === 0) {
      ctx.screen.printError(
        i18n.t('cmdForm.error.fieldsRequired', 'At least one field name is required for the get operation (use -f [field1, field2])'),
      );
      return;
    }
    const adapter = getFormRecord();
    if (adapter === null) {
      ctx.screen.printError(
        i18n.t('cmdForm.error.noFormView', 'No editable form view found in the current page'),
      );
      return;
    }
    const values = adapter.read(fields);
    ctx.screen.print(JSON.stringify(values, null, 2));
    return values;
  } else if (operation === 'edit') {
    const values: mixed = kwargs.value;
    if (typeof values !== 'object' || values === null || Array.isArray(values)) {
      ctx.screen.printError(
        i18n.t('cmdForm.error.valuesRequired', 'Values dict is required for the edit operation (use -v {field: value, ...})'),
      );
      return;
    }
    const adapter = getFormRecord();
    if (adapter === null) {
      ctx.screen.printError(
        i18n.t('cmdForm.error.noFormView', 'No editable form view found in the current page'),
      );
      return;
    }
    // $FlowFixMe[incompatible-variance]
    await adapter.update(values, await this.getContext());
    // $FlowFixMe[incompatible-use]
    const count: number = Object.keys(values).length;
    ctx.screen.print(
      i18n.t('cmdForm.result.edited', 'Updated {{count}} field(s) in the current form', {count}),
    );
  } else if (operation === 'highlight') {
    if (field.length === 0) {
      ctx.screen.printError(
        i18n.t('cmdForm.error.fieldRequired', 'A field name is required for the highlight operation'),
      );
      return;
    }

    // Phase 1: try to highlight directly (field may already be in the DOM).
    let count = await highlightFormFields(field);

    if (count === 0) {
      // Phase 2: field not in DOM (lazy-rendered tab not yet visited).
      // Analyze the view arch to find which notebook page(s) contain the field,
      // activate them in order, then retry.
      const context = await this.getContext();
      const arch = await getFormViewArch(context);
      if (typeof arch === 'string') {
        const path = findFieldNotebookPath(arch, field);
        if (path.length > 0) {
          await activateNotebookPath(path);
          count = await highlightFormFields(field);
        }
      }
    }

    if (count === 0) {
      ctx.screen.printError(
        i18n.t('cmdForm.error.fieldNotFound', "No form field '{{field}}' found in the current view", {field}),
      );
      return;
    }
    ctx.screen.print(
      i18n.t('cmdForm.result.highlighted', "Highlighted {{count}} field(s) '{{field}}'", {count, field}),
    );
  } else if (operation === 'save') {
    const adapter = getFormRecord();
    if (adapter === null) {
      ctx.screen.printError(
        i18n.t('cmdForm.error.noFormView', 'No editable form view found in the current page'),
      );
      return;
    }
    await adapter.save();
    ctx.screen.print(i18n.t('cmdForm.result.saved', 'Form record saved'));
  } else if (operation === 'clear') {
    clearFormFieldHighlights(field.length > 0 ? field : undefined);
    ctx.screen.print(i18n.t('cmdForm.result.cleared', 'Field highlights cleared'));
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdForm.definition', 'Interact with the current form view (get, edit, save, highlight, clear)'),
    callback: cmdForm,
    detail: i18n.t(
      'cmdForm.detail',
      'get: returns in-memory field values. edit: sets field values in the open form in-memory record (fires onchanges, does not save). save: persists the current form record to the database. highlight: visually marks a field, activating its notebook tab if needed. clear: removes highlights (all fields, or just -f if given).',
    ),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdForm.args.operation', 'The operation to perform'),
        undefined,
        ['get', 'edit', 'save', 'highlight', 'clear'],
      ],
      [
        ARG.List | ARG.String,
        ['f', 'field'],
        false,
        i18n.t('cmdForm.args.field', 'The field technical name(s)'),
      ],
      [
        ARG.Dictionary,
        ['v', 'value'],
        false,
        i18n.t('cmdForm.args.value', 'The field values to set (for the edit operation)'),
      ],
    ],
    example: '-o get -f [name, phone]',
  };
}
