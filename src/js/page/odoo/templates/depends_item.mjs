// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (display_name: string, name: string, id: number): string {
  return `${display_name} [${name}] (<span class='o_terminal_click o_terminal_cmd' data-cmd='view ir.module.module ${id}'>#${id}</span>)`;
}
