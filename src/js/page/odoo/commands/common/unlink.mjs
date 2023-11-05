// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import unlinkRecord from '@odoo/orm/unlink_record';
import searchRead from '@odoo/orm/search_read';
import {ARG} from '@trash/constants';

async function cmdUnlinkModelRecord(kwargs, screen) {
  return unlinkRecord(kwargs.model, kwargs.id, this.getContext()).then(
    result => {
      screen.print(`${kwargs.model} record deleted successfully`);
      return result;
    },
  );
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
  definition: 'Unlink record',
  callback: cmdUnlinkModelRecord,
  options: getOptions,
  detail: 'Delete a record.',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [ARG.List | ARG.Number, ['i', 'id'], true, "The record id's"],
  ],
  example: '-m res.partner -i 10,4,2',
};
