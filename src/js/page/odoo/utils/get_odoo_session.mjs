// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';

let cachedSession;
export default function (): OdooSession | void {
  const sess_obj = getOdooService('web.session', '@web/session');
  if (!sess_obj) {
    cachedSession = odoo.session_info || odoo.info;
  } else if (Object.hasOwn(sess_obj, 'session')) {
    cachedSession = sess_obj.session;
  }
  return cachedSession || sess_obj;
}
