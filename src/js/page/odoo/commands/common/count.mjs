// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchCount from '@odoo/orm/search_count';
import {ARG} from '@trash/constants';

async function cmdCount(kwargs) {
  return searchCount(kwargs.model, kwargs.domain, this.getContext()).then(
    result => {
      this.screen.print(`Result: ${result}`);
      return result;
    },
  );
}

export default {
  definition:
    'Gets number of records from the given model in the selected domain',
  callback: cmdCount,
  detail: 'Gets number of records from the given model in the selected domain',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [ARG.List | ARG.Any, ['d', 'domain'], false, 'The domain', []],
  ],
  example: "-m res.partner -d [['name', '=ilike', 'A%']]",
};
