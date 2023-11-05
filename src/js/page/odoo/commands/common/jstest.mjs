// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';
import searchRead from '@odoo/orm/search_read';

async function cmdJSTest(kwargs) {
  let mod = kwargs.module || '';
  if (kwargs.module === '*') {
    mod = '';
  }
  let url = '/web/tests';
  if (kwargs.device === 'mobile') {
    url += '/mobile';
  }
  url += `?module=${mod}`;
  window.location = url;
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
  definition: 'Launch JS Tests',
  callback: cmdJSTest,
  options: getOptions,
  detail: 'Runs js tests in desktop or mobile mode for the selected module.',
  args: [
    [ARG.String, ['m', 'module'], false, 'The module technical name'],
    [
      ARG.String,
      ['d', 'device'],
      false,
      'The device to test',
      'desktop',
      ['desktop', 'mobile'],
    ],
  ],
  example: '-m web -d mobile',
};
