// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import getOdooVersion from '@odoo/utils/get_odoo_version';

export default function (model: string, records: $ReadOnlyArray<{...}>, context: {...}): Promise<Array<number>> {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor < 13) {
    const proms = records.map(record => callModel<Array<number>>(model, 'create', [record], undefined, context));
    // $FlowFixMe
    return Promise.all(proms);
  }
  return callModel(model, 'create', [records], null, context);
}
