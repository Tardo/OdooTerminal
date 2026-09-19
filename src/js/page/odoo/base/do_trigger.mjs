// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersion from '@odoo/utils/get_odoo_version';

export default function (event_name: string, event_options: {[string]: mixed}): mixed {
  const OdooVerMajor = getOdooVersion('major');
  const OdooEnv = getOdooEnv();
  let trigger = null;
  let context = null;
  if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 14) {
    trigger = OdooEnv.bus.trigger;
    context = OdooEnv.bus;
  } else {
    trigger = OdooEnv.trigger_up;
    context = OdooEnv;
  }

  return trigger.call(context, event_name, event_options);
}
