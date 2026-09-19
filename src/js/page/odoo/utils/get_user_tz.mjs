// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooSession from './get_odoo_session';

export default function (): string | void {
  // $FlowFixMe[incompatible-type]
  return getOdooSession()?.user_context?.tz || luxon?.Settings?.defaultZoneName;
}
