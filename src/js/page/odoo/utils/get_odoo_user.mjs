// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';

export default function (): UserService | void {
  const user_obj = getOdooService('@web/core/user');
  if (!user_obj) {
    return undefined;
  }
  if (Object.hasOwn(user_obj, 'user')) {
    return user_obj.user;
  }
  return user_obj;
}
