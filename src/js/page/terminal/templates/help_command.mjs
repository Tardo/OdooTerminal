// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (cmd: string, def: string, is_internal: boolean): string {
  let html = '';
  if (is_internal) {
    html += is_internal ? "<span class='o_internal_cmd'>" : "<span>";
  }
  html += `<strong class='o_terminal_click o_terminal_cmd' data-cmd='help ${cmd}'>${cmd}</strong> - <i>${def}</i></span>`;
  return html;
}
