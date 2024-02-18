// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

async function cmdToggleTerm() {
  return this.doToggle();
}

export default {
  definition: i18n.t('cmdToggleTerm.definition', 'Toggle terminal visibility'),
  callback: cmdToggleTerm,
  detail: i18n.t('cmdToggleTerm.detail', 'Toggle terminal visibility'),
};
