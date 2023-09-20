// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersionMajor from '@odoo/utils/get_odoo_version_major';

export default function (event_name, event_options) {
  const OdooVer = getOdooVersionMajor();
  const OdooEnv = getOdooEnv();
  let trigger = null;
  let context = null;
  if (OdooVer >= 14) {
    trigger = OdooEnv.bus.trigger;
    context = OdooEnv.bus;
  } else {
    trigger = OdooEnv.trigger_up;
    context = OdooEnv;
  }

  return trigger.call(context, event_name, event_options);
}
