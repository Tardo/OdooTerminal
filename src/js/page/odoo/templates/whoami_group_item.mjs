// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (values) {
  return `<br>\u00A0\u00A0- ${values.name} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view ${values.model} ${values.id}'>#${values.id}</span>)`;
}
