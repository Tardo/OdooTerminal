// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import asyncSleep from '@terminal/utils/async_sleep';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getOdooRoot from '@odoo/utils/get_odoo_root';
import doTrigger from './do_trigger';

export default async function (action: string | number | {[string]: mixed}, options: ?{[string]: mixed}): Promise<> {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number') {
    if (OdooVerMajor >= 17) {
      await getOdooRoot().actionService.doAction(action, options);
    } else if (OdooVerMajor >= 14) {
      doTrigger('do-action', {action, options});
      // Simulate end of the 'action'
      // FIXME: This makes me cry
      await asyncSleep(1800);
    }
    return {id: action};
  }

  return await new Promise((resolve, reject) => {
    doTrigger('do_action', {
      action: action,
      options: options,
      on_success: resolve,
      on_fail: reject,
    });
  });
}
