// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import asyncSleep from '@terminal/utils/async_sleep';
import getOdooVersionMajor from '@odoo/utils/get_odoo_version_major';
import doTrigger from './do_trigger';

export default async function (action, options) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 14) {
    doTrigger('do-action', {action, options});
    // Simulate end of the 'action'
    // FIXME: This makes me cry
    await asyncSleep(1800);
    return {id: action};
  }

  return new Promise((resolve, reject) => {
    doTrigger('do_action', {
      action: action,
      options: options,
      on_success: resolve,
      on_fail: reject,
    });
  });
}
