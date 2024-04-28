// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  cmd_name: string;
  args: Array<string>;

  constructor(cmd_name: string, args: Array<string>) {
    super(i18n.t('trash.exception.invalidCommandArgumentsError', 'Invalid command arguments'));
    this.name = 'InvalidCommandArgumentsError';
    this.cmd_name = cmd_name;
    this.args = args;
  }
}
