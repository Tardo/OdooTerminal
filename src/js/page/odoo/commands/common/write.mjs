// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import writeRecord from '@odoo/orm/write_record';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';

async function cmdWriteModelRecord(kwargs, screen) {
  return writeRecord(
    kwargs.model,
    kwargs.id,
    kwargs.value,
    this.getContext(),
  ).then(result => {
    screen.print(
      i18n.t(
        'cmdWrite.result.success',
        '{{model}} record updated successfully',
        {
          model: kwargs.model,
        },
      ),
    );
    return result;
  });
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
  definition: i18n.t('cmdWrite.definition', 'Update record values'),
  callback: cmdWriteModelRecord,
  options: getOptions,
  detail: i18n.t('cmdWrite.detail', 'Update record values.'),
  args: [
    [
      ARG.String,
      ['m', 'model'],
      true,
      i18n.t('cmdWrite.args.model', 'The model technical name'),
    ],
    [
      ARG.List | ARG.Number,
      ['i', 'id'],
      true,
      i18n.t('cmdWrite.args.id', "The record id's"),
    ],
    [
      ARG.Dictionary,
      ['v', 'value'],
      true,
      i18n.t('cmdWrite.args.value', 'The values to write'),
    ],
  ],
  example: "-m res.partner -i 10,4,2 -v {street: 'Diagon Alley'}",
};
