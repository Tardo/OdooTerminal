// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default class extends Error {
  constructor(cmd_name, start, end) {
    super(
      i18n.t(
        'trash.exception.unknownCommandError',
        "Unknown Command '{{cmd_name}}' at {{start}}:{{end}}",
        {cmd_name, start, end},
      ),
    );
    this.name = 'UnknownCommandError';
    this.cmd_name = cmd_name;
    this.start = start;
    this.end = end;
  }
}
