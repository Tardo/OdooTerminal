// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import searchRead from '@odoo/orm/search_read';
import {ARG} from '@trash/constants';

async function cmdCheckModelAccess(kwargs, screen) {
  return callModel(
    kwargs.model,
    'check_access_rights',
    [kwargs.operation, false],
    null,
    this.getContext(),
  ).then(result => {
    if (result) {
      screen.print(
        `You have access rights for '${kwargs.operation}' on ${kwargs.model}`,
      );
    } else {
      screen.print(`You can't '${kwargs.operation}' on ${kwargs.model}`);
    }
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
  definition: 'Check model access',
  callback: cmdCheckModelAccess,
  options: getOptions,
  detail: 'Show access rights for the selected operation on the selected model',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [
      ARG.String,
      ['o', 'operation'],
      true,
      'The operation to do',
      undefined,
      ['create', 'read', 'write', 'unlink'],
    ],
  ],
  example: '-m res.partner -o read',
};
