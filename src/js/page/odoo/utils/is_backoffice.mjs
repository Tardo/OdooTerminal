// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

let isBackoffice = null;
export default function () {
  if (isBackoffice === null) {
    if (typeof getOdooSession()?.is_frontend !== 'undefined') {
      isBackoffice = !getOdooSession().is_frontend;
    } else {
      isBackoffice =
        document.querySelector("head script[src*='assets_frontend']") === null;
    }
  }
  return isBackoffice;
}
