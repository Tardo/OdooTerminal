// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchCount from '@odoo/orm/search_count';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';

async function cmdCount(kwargs, screen) {
  return searchCount(kwargs.model, kwargs.domain, this.getContext()).then(
    result => {
      screen.print(`Result: ${result}`);
      return result;
    },
  );
}

function getOptions(arg_name) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      null,
      item => item.model,
    );
  }
  return Promise.resolve([]);
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
