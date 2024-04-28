// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callService from '@odoo/osv/call_service';

export type CachedCallServiceOptions = {
  force?: boolean,
};

export type MapCallback = (item: mixed) => mixed;

// $FlowFixMe
const cache: {[string]: Object} = {};
export default async function (
  cache_name: string,
  service: string,
  method: string,
  args: $ReadOnlyArray<mixed>,
  options?: CachedCallServiceOptions,
  map_func?: MapCallback,
  // $FlowFixMe
): Object {
  if (options?.force === true || typeof cache[cache_name] === 'undefined') {
    let values: Array<mixed> = [];
    try {
      values = await callService(service, method, args);
    } catch (e) {
      // Do nothing
    }
    if (map_func) {
      cache[cache_name] = values.map(map_func);
    } else {
      cache[cache_name] = values;
    }
  }
  return cache[cache_name];
}
