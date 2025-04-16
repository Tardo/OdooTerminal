// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getSessionInfo from './get_session_info';
import getOdooSession from '@odoo/utils/get_odoo_session';
import getOdooUser from '@odoo/utils/get_odoo_user';

// Odoo deletes the 'uid' key in Odoo >17.0, we store it for future reference.
let cachedUID = -1;
export default async function (use_net: boolean = false): Promise<number> {
  const uid = getOdooSession()?.uid || getOdooSession()?.user_id;
  if (typeof uid === 'number') {
    cachedUID = uid;
  } else if (uid instanceof Array) {
    cachedUID = uid[0];
  } else if (getOdooUser()?.userId) {
    cachedUID = getOdooUser()?.userId || -1;
  } else if (use_net) {
    const session_info = await getSessionInfo();
    if (typeof session_info?.uid === 'number') {
      cachedUID = session_info.uid;
    }
  } else if (getOdooSession()?.storeData?.Store?.self.id) {
    cachedUID = getOdooSession()?.storeData?.Store?.self?.id || -1;
    if (cachedUID !== -1) {
      --cachedUID;
    }
  }
  return cachedUID;
}
