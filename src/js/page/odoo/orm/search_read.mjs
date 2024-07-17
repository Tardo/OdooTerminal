// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

export type SearchReadOptions = {
  orderBy: string,
  limit: number,
  offset: number,
};

export default function (
  model: string,
  domain: $ReadOnlyArray<OdooDomainTuple>,
  fields: $ReadOnlyArray<string> | false,
  context: ?{[string]: mixed},
  options: ?{[string]: mixed},
): Promise<Array<OdooSearchResponse>> {
  return callModel(model, 'search_read', [domain], null, context, {
    fields: fields,
    orderBy: options?.orderBy,
    limit: options?.limit,
    offset: options?.offset,
  },
  options);
}
