// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersionMajor from '@odoo/utils/get_odoo_version_major';

export default function (type, options) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer < 15) {
    return;
  }
  const payload = Object.assign({}, options, {type: type});
  getOdooEnv().bus.trigger('show-effect', payload);
}
