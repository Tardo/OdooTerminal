// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';

export default class extends Error {
  data: string;

  constructor() {
    super(i18n.t('terminal.exception.ElementNotFoundTemplateError', "No elements found!"));
    this.name = 'ElementNotFoundTemplateError';
  }
}
