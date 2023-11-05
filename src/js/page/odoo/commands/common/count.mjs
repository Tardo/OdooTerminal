// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchCount from '@odoo/orm/search_count';
import searchRead from '@odoo/orm/search_read';
import {ARG} from '@trash/constants';

async function cmdCount(kwargs, screen) {
  return searchCount(kwargs.model, kwargs.domain, this.getContext()).then(
    result => {
      screen.print(`Result: ${result}`);
      return result;
    },
  );
}

let cache = [];
async function getOptions(arg_name, arg_info, arg_value) {
  if (arg_name === 'model') {
    if (!arg_value) {
      const records = await searchRead(
        'ir.model',
        [],
        ['model'],
        this.getContext(),
      );
      cache = records.map(item => item.model);
      return cache;
    }
    return cache.filter(item => item.startsWith(arg_value));
  }
  return [];
}

export default {
  definition:
    'Gets number of records from the given model in the selected domain',
  callback: cmdCount,
  options: getOptions,
  detail: 'Gets number of records from the given model in the selected domain',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [ARG.List | ARG.Any, ['d', 'domain'], false, 'The domain', []],
  ],
  example: "-m res.partner -d [['name', '=ilike', 'A%']]",
};
