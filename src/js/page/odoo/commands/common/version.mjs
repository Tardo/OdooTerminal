// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import getOdooVersionInfo from '@odoo/utils/get_odoo_version_info';

async function cmdShowOdooVersion(kwargs, screen) {
  const version_info = getOdooVersionInfo();
  screen.print(
    `${version_info.slice(0, 3).join('.')} (${version_info
      .slice(3)
      .join(' ')})`,
  );
}

export default {
  definition: i18n.t('cmdVersion.definition', 'Know Odoo version'),
  callback: cmdShowOdooVersion,
  detail: i18n.t('cmdVersion.detail', 'Shows Odoo version'),
};
