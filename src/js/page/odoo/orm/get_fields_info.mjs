// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

// $FlowFixMe
export default function (
  model: string,
  fields: $ReadOnlyArray<string> | false,
  context: ?{[string]: mixed},
  options: ?{[string]: mixed},
  // $FlowFixMe
): Promise<{[string]: Object}> {
  // $FlowFixMe
  return callModel<{[string]: Object}>(model, 'fields_get', [fields], null, context, options);
}
