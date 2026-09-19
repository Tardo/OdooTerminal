// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooRoot from './get_odoo_root';

const defSymbol = Symbol.for('default');
// $FlowFixMe[unclear-type]
export default function (): Object {
  const root = getOdooRoot();
  if (Object.hasOwn(root, 'env')) {
    return root.env;
  } else if (Object.hasOwn(root, defSymbol)) {
    return root[defSymbol];
  }
  return root;
}
