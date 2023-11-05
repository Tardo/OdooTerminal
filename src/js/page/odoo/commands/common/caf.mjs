// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import searchRead from '@odoo/orm/search_read';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';

async function cmdCheckFieldAccess(kwargs, screen) {
  const fields = kwargs.field[0] === '*' ? false : kwargs.field;
  const result = await callModel(
    kwargs.model,
    'fields_get',
    [fields],
    null,
    this.getContext(),
  );

  let s_result = null;
  const keys = Object.keys(result);
  if (isEmpty(kwargs.filter)) {
    s_result = result;
  } else {
    s_result = [];
    const fkeys = Object.keys(kwargs.filter);
    for (const fkey of fkeys) {
      for (const key of keys) {
        if (
          Object.hasOwn(result[key], fkey) &&
          result[key][fkey] === kwargs.filter[fkey]
        ) {
          s_result[key] = result[key];
        }
      }
    }
  }
  const s_keys = Object.keys(s_result).sort();
  const fieldParams = [
    'type',
    'string',
    'relation',
    'required',
    'readonly',
    'searchable',
    'translate',
    'depends',
  ];
  const rows = [];
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
      let value = fieldDef[fieldParams[x2]];
      if (typeof value === 'undefined' || value === null) {
        value = '';
      }
      rows[row_index].push(value);
    }
  }
  fieldParams.unshift('field');
  screen.printTable(fieldParams, rows);
  return s_result;
}

let cache = [];
async function getOptions(arg_name, arg_info, arg_value) {
  if (arg_name === 'model') {
    if (!arg_value) {
      const records = await searchRead(
        'ir.model',
        [],
        ['model'],
        this.getContext(),
      );
      cache = records.map(item => item.model);
      return cache;
    }
    return cache.filter(item => item.startsWith(arg_value));
  }
  return [];
}

export default {
  definition: 'Check model fields access',
  callback: cmdCheckFieldAccess,
  options: getOptions,
  detail: 'Show readable/writeable fields of the selected model',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [
      ARG.List | ARG.String,
      ['f', 'field'],
      false,
      'The field names to request',
      ['*'],
    ],
    [ARG.Dictionary, ['fi', 'filter'], false, 'The filter to apply'],
  ],
  example: '-m res.partner -f name,street',
};
