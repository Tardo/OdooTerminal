// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import renderMetadata from '@odoo/templates/metadata';
import {ARG} from '@trash/constants';

async function cmdMetadata(kwargs) {
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
    this.screen.print("Can't found any metadata for the given id");
  } else {
    this.screen.print(renderMetadata(metadata));
  }
  return metadata;
}

export default {
  definition: 'View record metadata',
  callback: cmdMetadata,
  detail: 'View record metadata',
  args: [
    [ARG.String, ['m', 'model'], true, 'The record model'],
    [ARG.Number, ['i', 'id'], true, 'The record id'],
  ],
  example: '-m res.partner -i 1',
};
