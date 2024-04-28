// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import unique from '@terminal/utils/unique';

export default function (
  columns: $ReadOnlyArray<string>,
  rows: $ReadOnlyArray<$ReadOnlyArray<string>>,
  cls?: string,
): string {
  return (
    `<table class='print-table ${cls || ''}'>` +
    '<thead>' +
    '<tr>' +
    `<th>${unique(columns).join('</th><th>')}</th>` +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    `<tr>${rows.map(cells => `<td>${cells.join('</td><td>')}</td>`).join('</tr><tr>')}</tr>` +
    '</tbody>' +
    '</table>'
  );
}
