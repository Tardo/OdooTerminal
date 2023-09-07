// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import doAction from '@odoo/base/do_action';
import createRecord from '@odoo/orm/create_record';
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

export default {
  definition: 'Create new record',
  callback: cmdCreateModelRecord,
  detail: 'Open new model record in form view or directly.',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [ARG.List | ARG.Dictionary, ['v', 'value'], false, 'The values to write'],
  ],
  example: "-m res.partner -v {name: 'Poldoore'}",
};
