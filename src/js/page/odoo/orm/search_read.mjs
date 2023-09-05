// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModel from '@odoo/osv/call_model';

export default function (model, domain, fields, context, options) {
  return callModel(model, 'search_read', [domain], null, context, {
    fields: fields,
    orderBy: options?.orderBy,
    limit: options?.limit,
    offset: options?.offset,
  });
}
