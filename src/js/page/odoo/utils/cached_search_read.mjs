// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchRead from '@odoo/orm/search_read';

const cache = {};
export default async function (
  cache_name,
  model,
  domain,
  fields,
  context,
  options,
  map_func,
) {
  if (options?.force || typeof cache[cache_name] === 'undefined') {
    let records = [];
    try {
      records = await searchRead(model, domain, fields, context, options);
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
