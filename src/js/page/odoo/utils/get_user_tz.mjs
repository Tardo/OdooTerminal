// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooSession from './get_odoo_session';
import getOdooUser from './get_odoo_user';

export default function (): string | void {
  // $FlowFixMe[incompatible-type]
  return getOdooSession()?.user_context?.tz || getOdooUser()?.tz || luxon?.Settings?.defaultZoneName;
}
