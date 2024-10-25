// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import hash from 'object-hash';
import callModelMulti from '@odoo/osv/call_model_multi';

export type CachedCallModelMultiOptions = {
  force?: boolean,
};

export type MapCallback = (item: mixed) => mixed;

const cache: {[string]: OdooService} = {};
export default async function <T>(
  cache_name: string,
  model: string,
  ids: $ReadOnlyArray<number>,
  method: string,
  args: ?$ReadOnlyArray<mixed>,
  kwargs: ?{[string]: mixed},
  context: ?{[string]: mixed},
  options: ?CachedCallModelMultiOptions,
  extra_options: ?{[string]: mixed},
  map_func?: MapCallback,
): OdooService {
  const cache_hash = hash(Array.from(arguments).slice(0, 4));
  if (options?.force === true || !Object.hasOwn(cache, cache_hash)) {
    let values: T;
    try {
      values = await callModelMulti<T>(model, ids, method, args, kwargs, context, extra_options);
    } catch (_err) {
      // Do nothing
    }
    if (map_func && values instanceof Array) {
      cache[cache_hash] = values.map(map_func);
    } else {
      cache[cache_hash] = values;
    }
  }
  return cache[cache_hash];
}
