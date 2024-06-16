// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default class extends Error {
  constructor() {
    super(i18n.t('trash.exception.invalidCommandDefinition', "Invalid command definition!"));
    this.name = 'invalidCommandDefinitionError';
  }
}
