// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

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
  extra_params: ?Partial<SearchReadOptions>,
  options: ?{[string]: mixed},
): Promise<Array<OdooSearchResponse>> {
  return callModel(model, 'search_read', [domain], null, context, {
    fields: fields,
    orderBy: options?.orderBy,
    limit: options?.limit,
    offset: options?.offset,
    ...extra_params,
  },
  options);
}
