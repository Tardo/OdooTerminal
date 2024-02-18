// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import createRecord from '@odoo/orm/create_record';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import Recordset from '@terminal/core/recordset';
import renderRecordCreated from '@odoo/templates/record_created';
import {ARG} from '@trash/constants';

async function cmdCreateModelRecord(kwargs, screen) {
  if (typeof kwargs.value === 'undefined') {
    await doAction({
      type: 'ir.actions.act_window',
      res_model: kwargs.model,
      views: [[false, 'form']],
      target: 'current',
    });
    this.doHide();
    return;
  }

  const results = await createRecord(
    kwargs.model,
    kwargs.value,
    this.getContext(),
  );
  screen.print(
    renderRecordCreated({
      model: kwargs.model,
      new_ids: results,
    }),
  );

  const records = [];
  kwargs.value.forEach((item, index) => {
    records.push(Object.assign({}, item, {id: results[index]}));
  });
  return Recordset.make(kwargs.model, records);
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
  definition: i18n.t('cmdCreate.definition', 'Create new record'),
  callback: cmdCreateModelRecord,
  options: getOptions,
  detail: i18n.t(
    'cmdCreate.detail',
    'Open new model record in form view or directly.',
  ),
  args: [
    [
      ARG.String,
      ['m', 'model'],
      true,
      i18n.t('cmdCreate.args.model', 'The model technical name'),
    ],
    [
      ARG.List | ARG.Dictionary,
      ['v', 'value'],
      false,
      i18n.t('cmdCreate.args.value', 'The values to write'),
    ],
  ],
  example: "-m res.partner -v {name: 'Poldoore'}",
};
