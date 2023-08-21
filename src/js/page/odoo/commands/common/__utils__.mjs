// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from '@odoo/rpc';

export async function searchModules(module_names) {
  const payload = {
    method: 'search_read',
    model: 'ir.module.module',
    kwargs: {context: this.getContext()},
    fields: ['name', 'display_name'],
  };
  if (module_names && module_names.constructor === String) {
    payload.domain = [['name', '=', module_names]];
  } else if (module_names.length === 1) {
    payload.domain = [['name', '=', module_names[0]]];
  } else {
    payload.domain = [['name', 'in', module_names]];
  }
  return rpc.query(payload);
}
