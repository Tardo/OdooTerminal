// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (values) {
  return i18n.t(
    'terminal.templates.unknownCommand',
    "Unknown command '{{org_cmd}}' at {{start}}:{{end}}. Did you mean '<strong class='o_terminal_click o_terminal_cmd' data-cmd='help {{cmd}}'>{{cmd}}</strong>'?",
    {
      org_cmd: values.org_cmd,
      start: values.pos[0],
      end: values.pos[1],
      cmd: values.cmd,
    },
  );
}
