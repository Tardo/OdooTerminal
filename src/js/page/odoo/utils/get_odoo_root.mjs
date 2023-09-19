// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';

export default function () {
  const root = getOdooService(
    'root.widget',
    'web.web_client',
    '@web/legacy/js/env',
  );
  return root;
}
