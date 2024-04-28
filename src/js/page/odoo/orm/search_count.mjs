// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

export default function (model: string, domain: $ReadOnlyArray<OdooDomainTuple>, context: {...}): Promise<number> {
  return callModel<number>(model, 'search_count', [domain], null, context);
}
