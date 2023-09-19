// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooRoot from '@odoo/utils/get_odoo_root';
import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersionMajor from '@odoo/utils/get_odoo_version_major';

export default function (service, method) {
  const OdooVer = getOdooVersionMajor();
  const OdooEnv = getOdooEnv();
  const args = Array.prototype.slice.call(arguments, 2);
  let result = null;
  let trigger = null;
  let context = null;
  if (OdooVer === 14) {
    trigger = getOdooRoot().action_manager.trigger_up;
    context = getOdooRoot();
  } else {
    trigger = OdooVer >= 15 ? OdooEnv.bus.trigger : OdooEnv.trigger_up;
    context = OdooEnv;
  }
  trigger.bind(context)('call_service', {
    service: service,
    method: method,
    args: args,
    callback: function (r) {
      result = r;
    },
  });
  return result;
}
