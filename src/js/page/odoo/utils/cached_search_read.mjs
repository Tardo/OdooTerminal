// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import hash from 'object-hash';
import searchRead from '@odoo/orm/search_read';
import type {SearchReadOptions} from '@odoo/orm/search_read';

export type CacheSearchReadOptions = {
  force: boolean,
  ...SearchReadOptions,
};

// $FlowFixMe
export type CachedSearchReadMapCallback = (item: Object) => Array<mixed>;

// $FlowFixMe
const cache: {[string]: Array<Object>} = {};
export default async function (
  cache_name: string,
  model: string,
  domain: $ReadOnlyArray<OdooDomainTuple>,
  fields: $ReadOnlyArray<string> | false,
  context: {[string]: mixed},
  options: ?Partial<SearchReadOptions>,
  map_func: ?CachedSearchReadMapCallback,
  // $FlowFixMe
): Promise<Array<Object>> {
  const cache_hash = hash(Array.from(arguments).slice(0, 6));
  if (typeof cache[cache_hash] === 'undefined') {
    let records: Array<OdooSearchResponse> = [];
    try {
      records = await searchRead(model, domain, fields, context, options);
    } catch (e) {
      // Do nothing
    }
    if (map_func) {
      cache[cache_hash] = records.map(map_func);
    } else {
      cache[cache_hash] = records;
    }
  }
  return cache[cache_hash];
}
