// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

export default function (model: string, fields: $ReadOnlyArray<string>, context: {...}): Promise<> {
  return callModel(model, 'fields_get', [fields], null, context);
}
