// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default class extends Error {
  constructor(cmd_name, args) {
    super(
      i18n.t(
        'trash.exception.invalidCommandArgumentsError',
        'Invalid command arguments',
      ),
    );
    this.name = 'InvalidCommandArgumentsError';
    this.cmd_name = cmd_name;
    this.args = args;
  }
}
