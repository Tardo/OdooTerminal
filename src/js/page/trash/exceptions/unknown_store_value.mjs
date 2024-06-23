// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  vname: string;

  constructor(vname: string) {
    super(
      i18n.t('trash.exception.unknownStoreValue', "Unknown store value '{{vname}}'", {vname}),
    );
    this.name = 'UnknownStoreValue';
    this.vname = vname;
  }
}
