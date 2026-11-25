// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooService from './get_odoo_service';

export default function getOdooUser(): UserService | void {
  const user_obj = getOdooService('@web/core/user');
  if (!user_obj) {
    return undefined;
  }
  if (Object.hasOwn(user_obj, 'user')) {
    return user_obj.user;
  }
  return user_obj;
}

// Odoo 18+ removes `user_context` from the session: the user service keeps it.
// On frontend pages it only has `uid`, so it's ignored there.
export function getOdooUserContext(): {[string]: mixed} | void {
  const context = getOdooUser()?.context;
  if (context && typeof context === 'object' && 'lang' in context) {
    return context;
  }
}
