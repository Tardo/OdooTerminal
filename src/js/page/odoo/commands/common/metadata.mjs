// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import searchRead from '@odoo/orm/search_read';
import renderMetadata from '@odoo/templates/metadata';
import {ARG} from '@trash/constants';

async function cmdMetadata(kwargs, screen) {
  const metadata = (
    await callModelMulti(
      kwargs.model,
      [kwargs.id],
      'get_metadata',
      null,
      null,
      this.getContext(),
    )
  )[0];

  if (typeof metadata === 'undefined') {
    screen.print("Can't found any metadata for the given id");
  } else {
    screen.print(renderMetadata(metadata));
  }
  return metadata;
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
  definition: 'View record metadata',
  callback: cmdMetadata,
  options: getOptions,
  detail: 'View record metadata',
  args: [
    [ARG.String, ['m', 'model'], true, 'The record model'],
    [ARG.Number, ['i', 'id'], true, 'The record id'],
  ],
  example: '-m res.partner -i 1',
};
