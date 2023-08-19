// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (model, id) {
  return `<span class='o_terminal_click o_terminal_cmd' data-cmd='view ${model} ${id}'>#${id}</span>`;
}
