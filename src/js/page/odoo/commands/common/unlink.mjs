// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import unlinkRecord from '@odoo/orm/unlink_record';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';

async function cmdUnlinkModelRecord(kwargs, screen) {
  return unlinkRecord(kwargs.model, kwargs.id, this.getContext()).then(
    result => {
      screen.print(`${kwargs.model} record deleted successfully`);
      return result;
    },
  );
}

function getOptions(arg_name) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      null,
      item => item.model,
    );
  }
  return Promise.resolve([]);
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
