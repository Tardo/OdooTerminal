// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import callModel from '@odoo/osv/call_model';

export default function (model: string, domain: $ReadOnlyArray<OdooDomainTuple>, context: ?{[string]: mixed}, options: ?{[string]: mixed}): Promise<number> {
  return callModel<number>(model, 'search_count', [domain], null, context, options);
}
