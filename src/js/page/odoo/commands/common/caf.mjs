// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import isEmpty from '@trash/utils/is_empty';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCheckFieldAccess(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const fields = kwargs.field[0] === '*' ? false : kwargs.field;
  const result: {[string]: {[string]: string | number}} = await callModel(
    kwargs.model,
    'fields_get',
    [fields],
    null,
    this.getContext(),
  );

  let s_result: {[string]: {[string]: string | number}} = {};
  const keys = Object.keys(result);
  if (isEmpty(kwargs.filter)) {
    s_result = result;
  } else {
    const fkeys = Object.keys(kwargs.filter);
    for (const fkey of fkeys) {
      for (const key of keys) {
        if (Object.hasOwn(result[key], fkey) && result[key][fkey] === kwargs.filter[fkey]) {
          s_result[key] = result[key];
        }
      }
    }
  }
  const s_keys = Object.keys(s_result).sort();
  const fieldParams = ['type', 'string', 'relation', 'required', 'readonly', 'searchable', 'translate', 'depends'];
  const rows: Array<Array<string>> = [];
  const len = s_keys.length;
  for (let x = 0; x < len; ++x) {
    const row_index = rows.push([]) - 1;
    const field = s_keys[x];
    const fieldDef = s_result[field];
    if (fieldDef.required) {
      rows[row_index].push(`* <b style='color:mediumslateblue'>${field}</b>`);
    } else {
      rows[row_index].push(field);
    }
    const l2 = fieldParams.length;
    for (let x2 = 0; x2 < l2; ++x2) {
      const value = fieldDef[fieldParams[x2]] ?? '';
      rows[row_index].push(new String(value).toString());
    }
  }
  fieldParams.unshift('field');
  ctx.screen.printTable(fieldParams, rows);
  return s_result;
}

function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      undefined,
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdCaf.definition', 'Check model fields access'),
    callback: cmdCheckFieldAccess,
    options: getOptions,
    detail: i18n.t('cmdCaf.detail', 'Show readable/writeable fields of the selected model'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdCaf.args.model', 'The model technical name')],
      [ARG.List | ARG.String, ['f', 'field'], false, i18n.t('cmdCaf.args.field', 'The field names to request'), ['*']],
      [ARG.Dictionary, ['fi', 'filter'], false, i18n.t('cmdCaf.args.filter', 'The filter to apply')],
    ],
    example: '-m res.partner -f name,street',
  };
}
