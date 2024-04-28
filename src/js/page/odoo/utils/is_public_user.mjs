// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

export default function (): boolean {
  const is_web_user = getOdooSession()?.is_website_user;
  if (is_web_user === null || typeof is_web_user !== 'boolean') {
    return false;
  }
  return is_web_user;
}
