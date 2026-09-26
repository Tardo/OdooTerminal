// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (
  columns: $ReadOnlyArray<string>,
  rows: $ReadOnlyArray<$ReadOnlyArray<string>>,
  cls?: string,
): string {
  return (
    `<table class='print-table ${cls || ''}'>` +
    '<thead>' +
    '<tr>' +
    `<th>${[...new Set(columns)].join('</th><th>')}</th>` +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    `<tr>${rows.map(cells => `<td>${cells.join('</td><td>')}</td>`).join('</tr><tr>')}</tr>` +
    '</tbody>' +
    '</table>'
  );
}
