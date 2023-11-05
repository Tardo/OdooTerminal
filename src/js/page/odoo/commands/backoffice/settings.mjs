// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import doAction from '@odoo/base/do_action';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';

async function cmdOpenSettings(kwargs) {
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

function getOptions(arg_name) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      this.getContext({active_test: true}),
      null,
      item => item.name,
    );
  }
  return Promise.resolve([]);
}

export default {
  definition: 'Open settings page',
  callback: cmdOpenSettings,
  options: getOptions,
  detail: 'Open settings page.',
  args: [
    [
      ARG.String,
      ['m', 'module'],
      false,
      'The module technical name',
      'general_settings',
    ],
  ],
  example: '-m sale_management',
};
