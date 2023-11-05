// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callService from '@odoo/osv/call_service';

const cache = {};
export default async function (
  cache_name,
  service,
  method,
  args,
  options,
  map_func,
) {
  if (options?.force || typeof cache[cache_name] === 'undefined') {
    let values = [];
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
