// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from '@odoo/utils/get_odoo_session';

async function cmdLogOut() {
  const res = await getOdooSession().session_logout();
  this.screen.updateInputInfo({username: 'Public User'});
  this.screen.print('Logged out');
  await this.execute('reload', false, true);
  return res;
}

export default {
  definition: 'Log out',
  callback: cmdLogOut,
  detail: 'Session log out',
};
