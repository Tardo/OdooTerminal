// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooSession from './get_odoo_session';

let isBackoffice = null;
export default function (): boolean {
  if (isBackoffice === null) {
    const odoo_sess = getOdooSession();
    if (typeof odoo_sess !== 'undefined' && Object.hasOwn(odoo_sess, "is_frontend")) {
      isBackoffice = !odoo_sess.is_frontend;
    } else {
      isBackoffice = document.querySelector("head script[src*='assets_frontend']") === null;
    }
  }
  return isBackoffice;
}
