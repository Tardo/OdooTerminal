// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import callModel from '@odoo/osv/call_model';

export default function (model: string, ids: $ReadOnlyArray<number>, context: ?{[string]: mixed}, options: ?{[string]: mixed}): Promise<> {
  return callModel(model, 'unlink', [ids], null, context, undefined, options);
}
