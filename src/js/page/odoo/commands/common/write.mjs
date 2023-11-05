// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import writeRecord from '@odoo/orm/write_record';
import searchRead from '@odoo/orm/search_read';
import {ARG} from '@trash/constants';

async function cmdWriteModelRecord(kwargs, screen) {
  return writeRecord(
    kwargs.model,
    kwargs.id,
    kwargs.value,
    this.getContext(),
  ).then(result => {
    screen.print(`${kwargs.model} record updated successfully`);
    return result;
  });
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
  definition: 'Update record values',
  callback: cmdWriteModelRecord,
  options: getOptions,
  detail: 'Update record values.',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [ARG.List | ARG.Number, ['i', 'id'], true, "The record id's"],
    [ARG.Dictionary, ['v', 'value'], true, 'The values to write'],
  ],
  example: "-m res.partner -i 10,4,2 -v {street: 'Diagon Alley'}",
};
