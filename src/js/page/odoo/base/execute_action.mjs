// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooVersion from '@odoo/utils/get_odoo_version';
import doTrigger from './do_trigger';

export default function (payload) {
  const OdooVerMajor = getOdooVersion('major');
  if (OdooVerMajor < 15) {
    return;
  }
  doTrigger('execute-action', payload);
}
