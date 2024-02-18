// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
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
    screen.printError(
      i18n.t(
        'cmdMetadata.error.notFound',
        "Can't found any metadata for the given id",
      ),
    );
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
  definition: i18n.t('cmdMetadata.definition', 'View record metadata'),
  callback: cmdMetadata,
  options: getOptions,
  detail: i18n.t('cmdMetadata.detail', 'View record metadata'),
  args: [
    [
      ARG.String,
      ['m', 'model'],
      true,
      i18n.t('cmdMetadata.args.model', 'The record model'),
    ],
    [
      ARG.Number,
      ['i', 'id'],
      true,
      i18n.t('cmdMetadata.args.id', 'The record id'),
    ],
  ],
  example: '-m res.partner -i 1',
};
