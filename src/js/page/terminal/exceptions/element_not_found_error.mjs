// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';

export default class extends Error {
  data: string;

  constructor(selector: string) {
    super(i18n.t('terminal.exception.ElementNotFoundError', "Element not found error ({{selector}})!", {selector}));
    this.name = 'ElementNotFoundError';
  }
}
