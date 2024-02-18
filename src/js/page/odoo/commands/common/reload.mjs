// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

async function cmdReloadPage() {
  location.reload();
}

export default {
  definition: i18n.t('cmdReload.definition', 'Reload current page'),
  callback: cmdReloadPage,
  detail: i18n.t('cmdReload.detail', 'Reload current page.'),
};
