// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersionMajor from './get_odoo_version_major';
import getOwlVersionMajor from './get_owl_version_major';
import getOdooService from './get_odoo_service';

export default function () {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    const OwlVer = getOwlVersionMajor();
    if (OwlVer === 2) {
      const {Component} = owl;
      const {standaloneAdapter} = getOdooService('web.OwlCompatibility');
      return standaloneAdapter({Component});
    }
  }
  if (OdooVer === 14) {
    return getOdooService('root.widget');
  }
  return getOdooEnv();
}
