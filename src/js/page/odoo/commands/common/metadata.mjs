// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import cachedSearchRead from '@odoo/utils/cached_search_read';
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
