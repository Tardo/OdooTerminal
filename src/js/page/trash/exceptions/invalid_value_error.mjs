// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  value: mixed;

  constructor(value: mixed) {
    super(
      i18n.t('trash.exception.invalidValueError', "Invalid value '{{value}}'", {
        value: new String(value).toString(),
      }),
    );
    this.name = 'InvalidValueError';
    this.value = value;
  }
}
