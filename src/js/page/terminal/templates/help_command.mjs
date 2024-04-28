// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (cmd: string, def: string): string {
  return `<strong class='o_terminal_click o_terminal_cmd' data-cmd='help ${cmd}'>${cmd}</strong> - <i>${def}</i>`;
}
