// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

export default function (model: string, ids: $ReadOnlyArray<number>, context: ?{[string]: mixed}, options: ?{[string]: mixed}): Promise<> {
  return callModel(model, 'unlink', [ids], null, context, undefined, options);
}
