// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooVersionMajor from '@odoo/utils/get_odoo_version_major';
import doTrigger from './do_trigger';

export default function (payload) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer < 15) {
    return;
  }
  doTrigger('execute-action', payload);
}
