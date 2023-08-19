// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (values) {
  return `${values.model} record created successfully: <span class='o_terminal_click o_terminal_cmd' data-cmd='view ${values.model} ${values.new_id}'>${values.new_id}</span>`;
}
