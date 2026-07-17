// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default class extends Error {
  // Holds the original error thrown by the command (an Odoo RPCError with
  // its own '.data.name/.message/.debug', a plain Error, or a fallback string)
  // so callers can recover the real failure reason instead of this generic message.
  data: mixed;

  constructor(cmd_name: string, error_data: mixed) {
    super(i18n.t('terminal.exception.ProcessJobError', "Error executing '{{cmd_name}}'", {cmd_name}));
    this.name = 'ProcessJobError';
    this.data = error_data;
  }
}
