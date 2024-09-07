// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooVersion from '@odoo/utils/get_odoo_version';
import getOdooEnv from '@odoo/utils/get_odoo_env';
import doTrigger from './do_trigger';

export default function (type: string, options: {[string]: mixed}) {
  const OdooVerMajor = getOdooVersion('major');
  const payload = Object.assign({}, options, {type: type});
  if (typeof OdooVerMajor === 'number') {
    if (OdooVerMajor < 15) {
      // Not supported
      return;
    } else if (OdooVerMajor >= 17) {
      getOdooEnv().services.effect.add(payload);
      return;
    }
  }
  doTrigger('show-effect', payload);
}
