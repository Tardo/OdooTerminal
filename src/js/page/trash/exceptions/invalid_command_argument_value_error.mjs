// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default class extends Error {
  constructor(cmd_name, arg_value) {
    super(
      i18n.t(
        'trash.exception.invalidCommandArugmentValueError',
        "Unexpected '{{arg_value}}' value!",
        {arg_value},
      ),
    );
    this.name = 'InvalidCommandArgumentValueError';
    this.cmd_name = cmd_name;
    this.arg_value = arg_value;
  }
}
