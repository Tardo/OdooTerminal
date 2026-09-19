// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdOpenSettings(this: Terminal, kwargs: CMDCallbackArgs): Promise<void> {
  await doAction({
    name: 'Settings',
    type: 'ir.actions.act_window',
    res_model: 'res.config.settings',
    view_mode: 'form',
    views: [[false, 'form']],
    target: 'inline',
    context: {module: kwargs.module},
  });
  this.doHide();
}

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'name ASC'},
      item => item.name,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdSettings.definition', 'Open settings page'),
    category: 'system',
    callback: cmdOpenSettings,
    options: getOptions,
    detail: i18n.t('cmdSettings.detail', 'Open the Odoo Settings form view for the specified module. Does not return data.'),
    args: [
      [
        ARG.String,
        ['m', 'module'],
        false,
        i18n.t('cmdSettings.args.module', 'The module technical name'),
        'general_settings',
      ],
    ],
    example: '-m sale_management',
  };
}
