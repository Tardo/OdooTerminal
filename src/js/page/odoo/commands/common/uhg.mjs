// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import searchRead from '@odoo/orm/search_read';
import {ARG} from '@trash/constants';

async function cmdUserHasGroups(kwargs, screen) {
  return callModel(
    'res.users',
    'user_has_groups',
    [kwargs.group.join(',')],
    null,
    this.getContext(),
  ).then(result => {
    screen.print(result);
    return result;
  });
}

let cache = [];
async function getOptions(arg_name, arg_info, arg_value) {
  if (arg_name === 'group') {
    if (!arg_value) {
      const records = await searchRead(
        'ir.model.data',
        [['model', '=', 'res.groups']],
        ['name', 'module'],
        this.getContext(),
      );
      cache = records.map(item => `${item.module}.${item.name}`);
      return cache;
    }
    return cache.filter(item => item.startsWith(arg_value));
  }
  return [];
}

export default {
  definition: 'Check if user is in the selected groups',
  callback: cmdUserHasGroups,
  options: getOptions,
  detail: 'Check if user is in the selected groups.',
  args: [
    [
      ARG.List | ARG.String,
      ['g', 'group'],
      true,
      "The technical name of the group<br/>A group can be optionally preceded by '!' to say 'is not in group'",
    ],
  ],
  example: '-g base.group_user',
};
