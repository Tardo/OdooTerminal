// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import searchRead from '@odoo/orm/search_read';
import Recordset from '@terminal/core/recordset';
import {ARG} from '@trash/constants';

async function cmdSearchModelRecordId(kwargs, screen) {
  let fields = kwargs.field[0] === '*' ? false : kwargs.field;
  const bin_fields = [];

  // Due to possible problems with binary fields it is necessary to filter them out
  if (!fields && !kwargs.read_binary) {
    const fieldDefs = await callModel(
      kwargs.model,
      'fields_get',
      [fields],
      null,
      this.getContext(),
    );

    fields = [];
    Object.entries(fieldDefs).forEach(item => {
      if (item[1].type === 'binary') {
        bin_fields.push(item[0]);
      } else {
        fields.push(item[0]);
      }
    });
  }

  const result = await searchRead(
    kwargs.model,
    [['id', 'in', kwargs.id]],
    fields,
    this.getContext(),
  );

  if (bin_fields.length !== 0) {
    for (const item of result) {
      for (const bin_field of bin_fields) {
        item[bin_field] = {oterm: true, binary: true};
      }
    }
  }

  const recordset = Recordset.make(kwargs.model, result);
  screen.print(recordset);
  return recordset;
}

export default {
  definition: 'Search model record',
  callback: cmdSearchModelRecordId,
  detail: 'Launch orm search query.',
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [ARG.List | ARG.Number, ['i', 'id'], true, "The record id's"],
    [
      ARG.List | ARG.String,
      ['f', 'field'],
      false,
      "The fields to request<br/>Can use '*' to show all fields",
      ['display_name'],
    ],
    [ARG.Flag, ['rb', 'read-binary'], false, "Don't filter binary fields"],
  ],
  example: '-m res.partner -i 10,4,2 -f name,street',
};
