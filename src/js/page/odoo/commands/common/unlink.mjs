// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import unlinkRecord from '@odoo/orm/unlink_record';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';

async function cmdUnlinkModelRecord(kwargs, screen) {
  return unlinkRecord(kwargs.model, kwargs.id, this.getContext()).then(
    result => {
      screen.print(
        i18n.t(
          'cmdUnlink.result.success',
          '{{model}} record deleted successfully',
          {
            model: kwargs.model,
          },
        ),
      );
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
  definition: i18n.t('cmdUnlink.definition', 'Unlink record'),
  callback: cmdUnlinkModelRecord,
  options: getOptions,
  detail: i18n.t('cmdUnlink.detail', 'Delete a record.'),
  args: [
    [
      ARG.String,
      ['m', 'model'],
      true,
      i18n.t('cmdUnlink.args.model', 'The model technical name'),
    ],
    [
      ARG.List | ARG.Number,
      ['i', 'id'],
      true,
      i18n.t('cmdUnlink.args.id', "The record id's"),
    ],
  ],
  example: '-m res.partner -i 10,4,2',
};
