// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooVersion from '@odoo/utils/get_odoo_version';
import doTrigger from './do_trigger';

export default function (type: string, options: {[string]: mixed}) {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor < 15) {
    return;
  }
  const payload = Object.assign({}, options, {type: type});
  doTrigger('show-effect', payload);
}
