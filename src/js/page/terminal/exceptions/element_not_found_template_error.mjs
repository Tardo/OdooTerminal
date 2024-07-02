// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  data: string;

  constructor() {
    super(i18n.t('terminal.exception.ElementNotFoundTemplateError', "No elements found!"));
    this.name = 'ElementNotFoundTemplateError';
  }
}
