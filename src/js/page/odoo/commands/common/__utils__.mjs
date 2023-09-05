// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import searchRead from '@odoo/orm/search_read';

export async function searchModules(module_names) {
  let domain = null;
  if (module_names && module_names.constructor === String) {
    domain = [['name', '=', module_names]];
  } else if (module_names.length === 1) {
    domain = [['name', '=', module_names[0]]];
  } else {
    domain = [['name', 'in', module_names]];
  }
  return searchRead(
    'ir.module.module',
    domain,
    ['name', 'display_name'],
    this.getContext(),
  );
}
