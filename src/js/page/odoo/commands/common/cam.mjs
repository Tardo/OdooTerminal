// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/utils/cached_search_read';
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
