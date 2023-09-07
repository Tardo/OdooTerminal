// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooEnv from './get_odoo_env';
import asyncSleep from '@terminal/utils/async_sleep';
import getOdooVersionMajor from '@odoo/utils/get_odoo_version_major';

export default async function doAction(action, options) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    getOdooEnv().bus.trigger('do-action', {
      action: action,
      options: options,
    });
    // Simulate end of the 'action'
    // FIXME: This makes me cry
    await asyncSleep(1800);
    return {id: action};
  }

  return new Promise((resolve, reject) => {
    getOdooEnv().trigger_up('do_action', {
      action: action,
      options: options,
      on_success: resolve,
      on_fail: reject,
    });
  });
}
