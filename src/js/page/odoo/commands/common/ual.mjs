// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdUpdateAppList(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return callModel<boolean>('ir.module.module', 'update_list', null, null, this.getContext()).then(result => {
    if (result) {
      ctx.screen.print(i18n.t('cmdUal.result.success', 'The apps list has been updated successfully'));
    } else {
      ctx.screen.printError(i18n.t('cmdUal.error.noUpdate', "Can't update the apps list!"));
    }
    return result;
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdUal.definition', 'Update apps list'),
    callback: cmdUpdateAppList,
    detail: i18n.t('cmdUal.detail', 'Update apps list'),
  };
}
