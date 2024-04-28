// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  vname: string;
  start: number;
  end: number;

  constructor(vname: string, start: number, end: number) {
    super(
      i18n.t('trash.exception.invalidNameError', "Invalid name '{{vname}}' at {{start}}:{{end}}", {vname, start, end}),
    );
    this.name = 'InvalidNameError';
    this.vname = vname;
    this.start = start;
    this.end = end;
  }
}
