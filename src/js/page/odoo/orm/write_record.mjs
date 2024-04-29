// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

export default function (model: string, ids: $ReadOnlyArray<number>, data: {...}, context: {...}): Promise<> {
  return callModel(model, 'write', [ids, data], null, context);
}
