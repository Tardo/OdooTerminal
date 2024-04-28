// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

export default function (): number {
  const session = getOdooSession();
  if (session !== undefined) {
    if (session.uid !== null && typeof session.uid === 'number') {
      return session.uid;
    }
    if (session.user_id !== null && typeof session.user_id === 'number') {
      return session.user_id;
    }
  }
  return -1;
}
