// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getSessionInfo from './get_session_info';
import getOdooSession from '@odoo/utils/get_odoo_session';
import getOdooUser from '@odoo/utils/get_odoo_user';

export default async function (use_net: boolean = false): Promise<string> {
  let username = getOdooSession()?.username;
  if (typeof username === 'string') {
    return username;
  }
  // Odoo 18+ moves it to the user service
  const login = getOdooUser()?.login;
  if (typeof login === 'string' && login !== '') {
    return login;
  }
  if (use_net) {
    const session_info = await getSessionInfo();
    if (typeof session_info?.username === 'string') {
      return session_info.username;
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
