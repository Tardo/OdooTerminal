// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (values) {
  return (
    `<span style='color: gray;'>Login</span>: ${values.login}<br>` +
    `<span style='color: gray;'>User</span>: ${values.display_name} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.users ${values.user_id}'>#${values.user_id}</span>)<br>` +
    `<span style='color: gray;'>Partner</span>: ${values.partner[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.partner ${values.partner[0]}'>#${values.partner[0]}</span>)<br>` +
    `<span style='color: gray;'>Active Company</span>: ${values.company[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.company ${values.company[0]}'>#${values.company[0]}</span>)<br>` +
    `<span style='color: gray;'>In Companies</span>: ${values.companies}<br>` +
    `<span style='color: gray;'>In Groups</span>: ${values.groups}`
  );
}
