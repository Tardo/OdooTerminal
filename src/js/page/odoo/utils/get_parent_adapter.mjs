// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersion from './get_odoo_version';
import getOwlVersionMajor from './get_owl_version_major';
import getOdooService from './get_odoo_service';
import getOdooRoot from './get_odoo_root';

// $FlowFixMe
export default function (): Object {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number') {
    if (OdooVerMajor >= 15) {
      const OwlVer = getOwlVersionMajor();
      const OwlCompatServ = getOdooService('web.OwlCompatibility');
      if (OwlVer === 1) {
        // $FlowIgnore
        const {Component} = owl;
        const {ComponentAdapter} = OwlCompatServ;
        return new ComponentAdapter(null, {Component});
      } else if (OwlVer === 2) {
        // $FlowIgnore
        const {Component} = owl;
        const {standaloneAdapter} = OwlCompatServ;
        return standaloneAdapter({Component});
      }
    } else if (OdooVerMajor >= 14) {
      return getOdooRoot();
    }
  }
  return getOdooEnv();
}
