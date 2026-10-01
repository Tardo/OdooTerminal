// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import searchRead from '@odoo/orm/search_read';
import type {SearchReadOptions} from '@odoo/orm/search_read';

export type CacheSearchReadOptions = {
  force: boolean,
};

// $FlowFixMe[unclear-type]
export type CachedSearchReadMapCallback = (item: Object) => Array<mixed>;

// $FlowFixMe[unclear-type]
const cache: {[string]: Promise<Array<Object>>} = {};
export default async function (
  cache_name: string,
  model: string,
  domain: $ReadOnlyArray<OdooDomainTuple>,
  fields: $ReadOnlyArray<string> | false,
  context: {[string]: mixed},
  options: ?CacheSearchReadOptions,
  extra_params: ?Partial<SearchReadOptions>,
  map_func: ?CachedSearchReadMapCallback,
// $FlowFixMe[unclear-type]
): Promise<Array<Object>> {
  // cache_name identifies the projection; force refreshes the same query entry.
  const key = JSON.stringify([cache_name, model, domain, fields, context, extra_params || {}]);
  if (options?.force === true || !Object.hasOwn(cache, key)) {
    const request: typeof cache[string] = searchRead(model, domain, fields, context, extra_params || {}, {silent: true})
      .then(records => map_func ? records.map(map_func) : records)
      .catch(() => {
        // A failed older request must not evict a newer forced refresh.
        if (cache[key] === request) delete cache[key];
        return [];
      });
    cache[key] = request;
  }
  return cache[key];
}
