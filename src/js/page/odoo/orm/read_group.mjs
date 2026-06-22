// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

export default function (
  model: string,
  domain: $ReadOnlyArray<mixed>,
  fields: $ReadOnlyArray<string>,
  groupby: $ReadOnlyArray<string>,
  context: ?{[string]: mixed},
): Promise<Array<{[string]: mixed}>> {
  return callModel(model, 'read_group', [], null, context, {
    domain,
    fields,
    groupBy: groupby,
    lazy: false,
  });
}
