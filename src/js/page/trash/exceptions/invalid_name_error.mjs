// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default class extends Error {
  constructor(vname, start, end) {
    super(
      i18n.t(
        'trash.exception.invalidNameError',
        "Invalid name '{{vname}}' at {{start}}:{{end}}",
        {vname, start, end},
      ),
    );
    this.name = 'InvalidNameError';
    this.vname = vname;
    this.start = start;
    this.end = end;
  }
}
