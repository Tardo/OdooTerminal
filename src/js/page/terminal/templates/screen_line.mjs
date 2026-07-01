// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowFixMe[untyped-import]
import Recordset from '@terminal/core/recordset';
import encodeHTML from '@terminal/utils/encode_html';
import prettyObjectString from '@terminal/utils/pretty_object_string';
import renderTable from './screen_table';
import renderTableCellRecord from './screen_table_cell_record';
import renderTableCellRecordId from './screen_table_cell_record_id';
import FunctionTrash from '@trash/function';
// $FlowFixMe[untyped-type-import]
import type {Record} from '@terminal/core/recordset';

export function renderLineText(msg: string, cls?: string): string {
  return `<span class='line-text ${cls || ''}'>${msg}</span>`;
}

export function renderLineArray(msg: Array<mixed>, cls?: string): Array<string> {
  const res = [];
  const l = msg.length;
  for (let x = 0; x < l; ++x) {
    res.push(`<span class='line-array ${cls || ''}'>${renderLine(msg[x])[0]}</span>`);
  }
  return res;
}

export function renderLineObject(msg: mixed, cls?: string, indent: number = 4): string {
  return `<span class='line-object ${cls || ''}'>${prettyObjectString(msg, indent)}</span>`;
}

// $FlowFixMe[value-as-type]
export function renderLineRecordsetTable(model: string, records: Recordset, cls?: string): string {
  const columns = ['id'];
  const len = records.length;
  const rows: Array<Array<string>> = [];
  for (let x = 0; x < len; ++x) {
    const row_index = rows.push([]) - 1;
    // $FlowFixMe[value-as-type]
    // $FlowFixMe[prop-missing]
    const item: Record = records[x];
    // $FlowFixMe[prop-missing]
    rows[row_index].push(renderTableCellRecordId(model, item.id));
    const keys = Object.keys(item);
    const keys_len = keys.length;
    let index = 0;
    while (index < keys_len) {
      const field: string = keys[index];
      if (field === 'id') {
        ++index;
        continue;
      }
      columns.push(encodeHTML(field));
      // $FlowFixMe[class-object-subtyping]
      rows[row_index].push(renderTableCellRecord(model, field, item));
      ++index;
    }
  }
  return renderTable(columns, rows, cls);
}

export default function renderLine(msg: mixed, cls?: string): Array<string> {
  const res = [];
  if (typeof msg === 'object') {
    if (msg instanceof Text) {
      res.push(renderLineText(msg, cls));
    } else if (msg instanceof Recordset) {
      res.push(renderLineRecordsetTable(msg.model, msg, cls));
    } else if (msg instanceof Array) {
      if (msg.some((item: mixed) => item !== null && typeof item === 'object')) {
        // Nested arrays/objects: show the real literal representation (e.g. [["aa","BB"],["dd","DD"]])
        // instead of losing data or flattening it into a comma-joined string.
        res.push(renderLineObject(msg, cls, 0));
      } else {
        res.push(...renderLineArray(msg, cls));
      }
    } else if (msg instanceof FunctionTrash) {
      res.push(renderLineText(msg, cls));
    } else {
      res.push(renderLineObject(msg, cls));
    }
  } else {
    res.push(renderLineText(new String(msg).toString(), cls));
  }
  return res;
}
