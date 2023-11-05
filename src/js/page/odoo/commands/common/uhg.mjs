// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import cachedSearchRead from '@odoo/utils/cached_search_read';
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

function getOptions(arg_name) {
  if (arg_name === 'group') {
    return cachedSearchRead(
      'options_ir.model.data_res.groups_active',
      'ir.model.data',
      [['model', '=', 'res.groups']],
      ['name', 'module'],
      this.getContext({active_test: true}),
      null,
      item => `${item.module}.${item.name}`,
    );
  }
  return Promise.resolve([]);
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
