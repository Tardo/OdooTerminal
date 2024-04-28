// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

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
  map_func: CachedSearchReadMapCallback,
  // $FlowFixMe
): Promise<Array<Object>> {
  if (typeof cache[cache_name] === 'undefined') {
    let records: Array<OdooSearchResponse> = [];
    try {
      records = await searchRead(model, domain, fields, context);
    } catch (e) {
      // Do nothing
    }
    if (map_func) {
      cache[cache_name] = records.map(map_func);
    } else {
      cache[cache_name] = records;
    }
  }
  return cache[cache_name];
}
