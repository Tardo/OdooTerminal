// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';
import getUID from './get_uid';
import cachedSearchRead from './cached_search_read';

export default async function (): Promise<string> {
  // $FlowFixMe
  let username = getOdooSession()?.username;
  if (typeof username === 'string') {
    return username;
  }
  if (typeof username === 'undefined' && getUID()) {
    // $FlowFixMe
    const user_ctx: {[string]: mixed} = getOdooSession()?.user_context ?? {};
    const res = await cachedSearchRead(
      `get_username.login.${getUID()}`,
      'res.users',
      [['id', 'in', [getUID()]]],
      ['login'],
      user_ctx,
    );
    const login_name = res && res[0]?.login;
    if (login_name) {
      return login_name;
    }
  }

  username = getOdooSession()?.partner_display_name;
  if (typeof username === 'string') {
    const name_parts = username.split(',', 2);
    if (name_parts.length === 2) {
      return name_parts[1];
    }
  }
  return '';
}
