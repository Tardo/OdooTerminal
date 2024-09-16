// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

export default function (): string | void {
  // $FlowIgnore
  return getOdooSession()?.user_context?.tz || luxon?.Settings?.defaultZoneName;
}
