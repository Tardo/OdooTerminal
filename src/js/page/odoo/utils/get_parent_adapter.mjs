// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersion from './get_odoo_version';
import getOwlVersionMajor from './get_owl_version_major';
import getOdooService from './get_odoo_service';
import getOdooRoot from './get_odoo_root';

export default function () {
  const OdooVerMajor = getOdooVersion('major');
  if (OdooVerMajor >= 15) {
    const OwlVer = getOwlVersionMajor();
    if (OwlVer === 1) {
      const {Component} = owl;
      const {ComponentAdapter} = getOdooService('web.OwlCompatibility');
      return new ComponentAdapter(null, {Component});
    } else if (OwlVer === 2) {
      const {Component} = owl;
      const {standaloneAdapter} = getOdooService('web.OwlCompatibility');
      return standaloneAdapter({Component});
    }
  } else if (OdooVerMajor >= 14) {
    return getOdooRoot();
  }
  return getOdooEnv();
}
