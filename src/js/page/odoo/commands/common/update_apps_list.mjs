// @flow strict
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import type {CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdUpdateAppsList(this: Terminal, kwargs: any, ctx: CMDCallbackContext) {
  try {
    debugger;
    await callModel(
      'ir.module.module',
      'update_list',
      [],
      {},
      await this.getContext(),
    );

    ctx.screen.print(
      i18n.t('cmdUpdateAppsList.success', 'Apps list successfully updated'),
    );
  } catch (err) {
    throw new Error(
      err?.message ||
      i18n.t('cmdUpdateAppsList.error', 'Failed to update apps list'),
    );
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdUpdateAppsList.definition', 'Update apps list'),
    callback: cmdUpdateAppsList,
    detail: i18n.t('cmdUpdateAppsList.detail', 'Refresh available modules list.'),
    args: [],
    example: '',
  };
}