// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {highlightFormFields, clearFormFieldHighlights, activateNotebookPath} from '@odoo/utils/highlight_form_field';
import {getFormViewArch, findFieldNotebookPath} from '@odoo/utils/get_form_view_arch';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdForm(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<void> {
  const operation: mixed = kwargs.operation;
  const field: mixed = kwargs.field;

  if (operation === 'highlight') {
    if (typeof field !== 'string' || field.length === 0) {
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
  } else if (operation === 'clear') {
    clearFormFieldHighlights(typeof field === 'string' && field.length > 0 ? field : undefined);
    ctx.screen.print(i18n.t('cmdForm.result.cleared', 'Field highlights cleared'));
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdForm.definition', 'Highlight or clear field highlights on the current form view'),
    callback: cmdForm,
    detail: i18n.t('cmdForm.detail', 'highlight: visually marks a field in the open form view, activating its notebook tab if needed. clear: removes highlights (all fields, or just -f if given). Does not return data.'),
    args: [
      [
        ARG.String,
        ['o', 'operation'],
        true,
        i18n.t('cmdForm.args.operation', 'The operation to perform'),
        undefined,
        ['highlight', 'clear'],
      ],
      [
        ARG.String,
        ['f', 'field'],
        false,
        i18n.t('cmdForm.args.field', 'The field technical name'),
      ],
    ],
    example: '-o highlight -f partner_id',
  };
}
