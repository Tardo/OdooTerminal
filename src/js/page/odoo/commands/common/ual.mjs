// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

async function cmdUpdateAppList(kwargs, screen) {
  return callModel(
    'ir.module.module',
    'update_list',
    null,
    null,
    this.getContext(),
  ).then(result => {
    if (result) {
      screen.print('The apps list has been updated successfully');
    } else {
      screen.printError("Can't update the apps list!");
    }
    return result;
  });
}

export default {
  definition: 'Update apps list',
  callback: cmdUpdateAppList,
  detail: 'Update apps list',
};
