// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import {ARG} from '@trash/constants';

async function cmdCheckModelAccess(kwargs) {
  return callModel(
    kwargs.model,
    'check_access_rights',
    [kwargs.operation, false],
    null,
    this.getContext(),
  ).then(result => {
    if (result) {
      this.screen.print(
        `You have access rights for '${kwargs.operation}' on ${kwargs.model}`,
      );
    } else {
      this.screen.print(`You can't '${kwargs.operation}' on ${kwargs.model}`);
    }
    return result;
  });
}

export default {
  definition: 'Check model access',
  callback: cmdCheckModelAccess,
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
