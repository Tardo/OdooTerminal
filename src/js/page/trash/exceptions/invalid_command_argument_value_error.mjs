// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  cmd_name: string;
  arg_value: mixed;

  constructor(cmd_name: string, arg_value: mixed) {
    super(i18n.t('trash.exception.invalidCommandArugmentValueError', "Unexpected '{{arg_value}}' value!", {arg_value}));
    this.name = 'InvalidCommandArgumentValueError';
    this.cmd_name = cmd_name;
    this.arg_value = arg_value;
  }
}
