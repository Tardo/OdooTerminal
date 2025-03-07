// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {Record} from '@terminal/core/recordset';
import encodeHTML from '@terminal/utils/encode_html';
import prettyObjectString from '@terminal/utils/pretty_object_string';

export default function (model: string, field: string, item: {[string]: string | number}): string {
  const item_val = item[field];
  if (item instanceof Record && item.__info[field]?.type === 'binary') {
    return `<span class='btn terminal-btn-secondary o_terminal_click o_terminal_read_bin_field' data-model='${model}' data-id='${item.id}' data-field='${field}'>Try Read Field</span>`;
  } else if (
    item_val !== null &&
    typeof item_val === 'object' &&
    !(item_val instanceof Array)
  ) {
    return prettyObjectString(item_val);
  }
  return encodeHTML(String(item_val));
}
