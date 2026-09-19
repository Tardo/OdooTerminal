// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooVersion from '@odoo/utils/get_odoo_version';
import getOdooEnv from '@odoo/utils/get_odoo_env';
import doTrigger from './do_trigger';

export default function (type: string, options: {[string]: mixed}) {
  const OdooVerMajor = getOdooVersion('major');
  const payload = {
    ...options,
    type: type,
  };
  if (typeof OdooVerMajor === 'number') {
    if (OdooVerMajor < 15) {
      // Not supported
      return;
    } else if (OdooVerMajor >= 17) {
      getOdooEnv().services.effect.add(payload);
      return;
    }
  }
  // $FlowFixMe[incompatible-type]
  doTrigger('show-effect', payload);
}
