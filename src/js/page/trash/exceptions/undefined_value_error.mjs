// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  vname: string;

  constructor(vname: string) {
    super(
      i18n.t('trash.exception.undefinedValueError', "Cannot read properties of undefined (reading '{{vname}}')", {
        vname,
      }),
    );
    this.name = 'UndefinedValueError';
    this.vname = vname;
  }
}
