// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';
import getOdooSession from './get_odoo_session';

export default function (options, onerror) {
  return getOdooSession()?.get_file({
    complete: getOdooService('web.framework')?.unblockUI,
    data: Object.assign({}, options, {
      download: true,
      data: getOdooService('web.utils')?.is_bin_size(options.data)
        ? null
        : options.data,
    }),
    error: onerror,
    url: '/web/content',
  });
}
