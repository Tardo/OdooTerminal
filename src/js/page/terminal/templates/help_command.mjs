// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (values) {
  return `<strong class='o_terminal_click o_terminal_cmd' data-cmd='help ${values.cmd}'>${values.cmd}</strong> - <i>${values.def}</i>`;
}
