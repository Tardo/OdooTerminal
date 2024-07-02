// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

export default function (): string {
  // $FlowFixMe
  let username = getOdooSession()?.username;
  if (typeof username === 'string') {
    return username;
  } else {
    username = getOdooSession()?.partner_display_name;
    if (typeof username === 'string') {
      const name_parts = username.split(',', 2);
      if (name_parts.length === 2) {
        return name_parts[1];
      }
    }
  }
  return '';
}
