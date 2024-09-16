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
      const owl_ver = getOwlVersionMajor();
      const owl_compat_obj = getOdooService('web.OwlCompatibility');
      if (typeof owl_compat_obj !== 'undefined') {
        if (owl_ver === 1) {
          // $FlowIgnore
          const {Component} = owl;
          const {ComponentAdapter} = owl_compat_obj;
          return new ComponentAdapter(null, {Component});
        } else if (owl_ver === 2) {
          // $FlowIgnore
          const {Component} = owl;
          const {standaloneAdapter} = owl_compat_obj;
          return standaloneAdapter({Component});
        }
      }
    } else if (OdooVerMajor >= 14) {
      return getOdooRoot();
    }
  }
  return getOdooEnv();
}
