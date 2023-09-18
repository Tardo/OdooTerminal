// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';

const defSymbol = Symbol.for('default');
export default function () {
  const root = getOdooService(
    'root.widget',
    'web.web_client',
    '@web/legacy/js/env',
  );
  if (Object.hasOwn(root, 'env')) {
    return root.env;
  } else if (Object.hasOwn(root, defSymbol)) {
    return root[defSymbol];
  }
  return root;
}
