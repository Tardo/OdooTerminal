// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import hash from 'object-hash';
import callService from '@odoo/osv/call_service';

export type CachedCallServiceOptions = {
  force?: boolean,
};

export type MapCallback = (item: mixed) => mixed;

const cache: {[string]: OdooService} = {};
export default async function (
  cache_name: string,
  service: string,
  method: string,
  args: $ReadOnlyArray<mixed>,
  options?: CachedCallServiceOptions,
  map_func?: MapCallback,
): OdooService {
  const cache_hash = hash(Array.from(arguments).slice(0, 4));
  if (options?.force === true || !Object.hasOwn(cache, cache_hash)) {
    let values: Array<mixed> = [];
    try {
      values = await callService(service, method, args);
    } catch (_err) {
      // Do nothing
    }
    if (map_func) {
      cache[cache_hash] = values.map(map_func);
    } else {
      cache[cache_hash] = values;
    }
  }
  return cache[cache_hash];
}
