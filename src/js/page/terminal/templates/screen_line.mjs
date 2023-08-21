// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import Recordset from '@terminal/core/recordset';
import encodeHTML from '@terminal/utils/encode_html';
import prettyObjectString from '@terminal/utils/pretty_object_string';
import renderTable from './screen_table';
import renderTableCellRecord from './screen_table_cell_record';
import renderTableCellRecordId from './screen_table_cell_record_id';

export function renderLineText(msg, cls) {
  return `<span class='line-text ${cls}'>${msg}</span>`;
}

export function renderLineArray(msg, cls) {
  const res = [];
  const l = msg.length;
  for (let x = 0; x < l; ++x) {
    res.push(`<span class='line-array ${cls}'>${renderLine(msg[x])}</span>`); // eslint-disable-line no-use-before-define
  }
  return res;
}

export function renderLineObject(msg, cls) {
  return `<span class='line-object ${cls}'> ${prettyObjectString(msg)}</span>`;
}

export function renderLineRecordsetTable(model, records, cls) {
  const columns = ['id'];
  const len = records.length;
  const rows = [];
  for (let x = 0; x < len; ++x) {
    const row_index = rows.push([]) - 1;
    const item = records[x];
    rows[row_index].push(renderTableCellRecordId(model, item.id));
    const keys = Object.keys(item);
    const keys_len = keys.length;
    let index = 0;
    while (index < keys_len) {
      const field = keys[index];
      if (field === 'id') {
        ++index;
        continue;
      }
      columns.push(encodeHTML(field));
      rows[row_index].push(renderTableCellRecord(model, field, item));
      ++index;
    }
  }
  return renderTable(columns, rows, cls);
}

export default function renderLine(msg, cls) {
  const res = [];
  if (typeof msg === 'object') {
    if (msg.constructor === Text) {
      res.push(renderLineText(msg, cls));
    } else if (msg instanceof Recordset) {
      res.push(renderLineRecordsetTable(msg.model, msg, cls));
    } else if (msg.constructor === Array) {
      res.push(...renderLineArray(msg, cls));
    } else {
      res.push(renderLineObject(msg, cls));
    }
  } else {
    res.push(renderLineText(msg, cls));
  }
  return res;
}
