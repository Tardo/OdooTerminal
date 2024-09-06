// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

// Odoo deletes the 'uid' key in Odoo >17.0, we store it for future reference.
let cachedUID = -1;
export default function (): number {
  const uid = getOdooSession()?.uid || getOdooSession()?.user_id;
  if (typeof uid === 'number') {
    cachedUID = uid;
  } else if (uid instanceof Array) {
    cachedUID = uid[0];
  } else if (getOdooSession()?.storeData?.Store?.self.id) {
    // FIXME: Strange, but that's how it is... Odoo making friends :)
    cachedUID = getOdooSession()?.storeData?.Store?.self.id - 1;
  }
  return cachedUID;
}
