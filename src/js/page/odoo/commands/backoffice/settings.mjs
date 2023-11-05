// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import doAction from '@odoo/base/do_action';
import searchRead from '@odoo/orm/search_read';
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

let cache = [];
async function getOptions(arg_name, arg_info, arg_value) {
  if (arg_name === 'module') {
    if (!arg_value) {
      const records = await searchRead(
        'ir.module.module',
        [],
        ['name'],
        this.getContext(),
      );
      cache = records.map(item => item.name);
      return cache;
    }
    return cache.filter(item => item.startsWith(arg_value));
  }
  return [];
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
