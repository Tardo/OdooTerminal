// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

async function cmdQuit() {
  this.doHide();
}

export default {
  definition: i18n.t('cmdPrint.definition', 'Close terminal'),
  callback: cmdQuit,
  detail: i18n.t('cmdPrint.detail', 'Close the terminal.'),
};
