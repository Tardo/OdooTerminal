// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

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
  definition: 'Know Odoo version',
  callback: cmdShowOdooVersion,
  detail: 'Shows Odoo version',
};
