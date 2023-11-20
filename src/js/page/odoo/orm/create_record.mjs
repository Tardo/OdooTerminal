// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';
import getOdooVersion from '@odoo/utils/get_odoo_version';

export default function (model, records, context) {
  const OdooVerMajor = getOdooVersion('major');
  if (OdooVerMajor < 13) {
    const proms = records.map(record =>
      callModel(model, 'create', [record], null, context),
    );
    return Promise.all(proms);
  }
  return callModel(model, 'create', [records], null, context);
}
