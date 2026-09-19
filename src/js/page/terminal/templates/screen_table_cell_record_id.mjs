// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (model: string, id: number): string {
  return `<span class='o_terminal_click o_terminal_cmd' data-cmd='view ${model} ${id}'>#${id}</span>`;
}
