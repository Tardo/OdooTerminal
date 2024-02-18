// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default class extends Error {
  constructor(arg_name, start, end) {
    super(
      i18n.t(
        'trash.exception.notExpectedCommandArgumentError',
        "Argument '{{arg_name}}' not expected at {{start}}:{{end}}",
        {arg_name, start, end},
      ),
    );
    this.name = 'NotExpectedCommandArgumentError';
    this.arg_name = arg_name;
    this.start = start;
    this.end = end;
  }
}
