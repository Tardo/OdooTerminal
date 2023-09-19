// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooRoot from './get_odoo_root';

const defSymbol = Symbol.for('default');
export default function () {
  const root = getOdooRoot();
  if (Object.hasOwn(root, 'env')) {
    return root.env;
  } else if (Object.hasOwn(root, defSymbol)) {
    return root[defSymbol];
  }
  return root;
}
