// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import callModel from '@odoo/osv/call_model';

export default function (model: string, ids: $ReadOnlyArray<number>, data: {...}, context: ?{[string]: mixed}, options: ?{[string]: mixed}): Promise<> {
  return callModel(model, 'write', [ids, data], null, context, undefined, options);
}
