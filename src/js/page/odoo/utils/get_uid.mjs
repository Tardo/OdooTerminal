// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

export default function (): number {
  const uid = getOdooSession()?.uid || getOdooSession()?.user_id;
  if (typeof uid === 'number') {
    return uid;
  } else if (uid instanceof Array) {
    return uid[0];
  }
  return -1;
}
