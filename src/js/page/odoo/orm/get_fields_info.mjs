// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import callModel from '@odoo/osv/call_model';

export default function (
  model: string,
  fields: $ReadOnlyArray<string> | false,
  context: ?{[string]: mixed},
  options: ?{[string]: mixed},
// $FlowFixMe[unclear-type]
): Promise<{[string]: Object}> {
  // $FlowFixMe[unclear-type]
  return callModel<{[string]: Object}>(model, 'fields_get', [fields], null, context, options);
}
