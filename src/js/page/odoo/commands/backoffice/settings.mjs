// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
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

function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      this.getContext({active_test: true}),
      item => item.name,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdSettings.definition', 'Open settings page'),
    callback: cmdOpenSettings,
    options: getOptions,
    detail: i18n.t('cmdSettings.detail', 'Open settings page.'),
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
