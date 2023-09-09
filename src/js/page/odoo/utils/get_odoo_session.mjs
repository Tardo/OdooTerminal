// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';

export default function () {
  const sess_obj = getOdooService('web.session', '@web/session');
  if (!sess_obj) {
    return odoo.session_info || odoo.info;
  }
  if (Object.hasOwn(sess_obj, 'session')) {
    return sess_obj.session;
  }
  return sess_obj;
}
