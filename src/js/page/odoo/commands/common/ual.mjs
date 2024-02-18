// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
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
      screen.print(
        i18n.t(
          'cmdUal.result.success',
          'The apps list has been updated successfully',
        ),
      );
    } else {
      screen.printError(
        i18n.t('cmdUal.error.noUpdate', "Can't update the apps list!"),
      );
    }
    return result;
  });
}

export default {
  definition: i18n.t('cmdUal.definition', 'Update apps list'),
  callback: cmdUpdateAppList,
  detail: i18n.t('cmdUal.detail', 'Update apps list'),
};
