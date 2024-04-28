// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import encodeHTML from '@terminal/utils/encode_html';

export default function (model: string, field: string, item: {[string]: string | number}): string {
  const item_val = item[field];
  if (
    item_val !== null &&
    typeof item_val === 'undefined' &&
    typeof item_val === 'object' &&
    item_val.oterm &&
    item_val.binary
  ) {
    return `<span class='btn btn-secondary o_terminal_click o_terminal_read_bin_field' data-model='${model}' data-id='${item.id}' data-field='${field}'>Try Read Field</span>`;
  }
  return encodeHTML(String(item_val));
}
