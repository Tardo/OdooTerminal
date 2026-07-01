// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowFixMe[untyped-import]
import {Record} from '@terminal/core/recordset';
import formatCellValue from '@terminal/utils/format_cell_value';

export default function (model: string, field: string, item: {[string]: string | number}): string {
  const item_val = item[field];
  // $FlowFixMe[invalid-compare]
  if (item instanceof Record && item.__info[field]?.type === 'binary') {
    return `<span class='btn btn-secondary o_terminal_click o_terminal_read_bin_field' data-model='${model}' data-id='${item.id}' data-field='${field}'>Try Read Field</span>`;
  }
  return formatCellValue(item_val);
}
