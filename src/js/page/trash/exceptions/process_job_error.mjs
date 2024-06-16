// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  data: string;

  constructor(cmd_name: string, error_data: string) {
    super(i18n.t('terminal.exception.ProcessJobError', "Error executing '{{cmd_name}}'", {cmd_name}));
    this.name = 'ProcessJobError';
    this.data = error_data;
  }
}
