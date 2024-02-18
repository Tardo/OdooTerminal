// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default class extends Error {
  constructor(cmd_name, error_data) {
    super(
      i18n.t(
        'terminal.exception.ProcessJobError',
        "Error executing '{{cmd_name}}'",
        {cmd_name},
      ),
    );
    this.name = 'ProcessJobError';
    this.data = error_data;
  }
}
