// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooService from './get_odoo_service';
import getOdooSession from './get_odoo_session';

export type GetContentOnErrorCallback = (error: {[string]: mixed}) => void;

export default function (data_opts: {[string]: mixed}, onerror: GetContentOnErrorCallback): boolean {
  return getOdooSession()?.get_file({
    complete: getOdooService('web.framework')?.unblockUI,
    data: Object.assign({}, data_opts, {
      download: true,
      data: getOdooService('web.utils')?.is_bin_size(data_opts.data) ? null : data_opts.data,
    }),
    error: onerror,
    url: '/web/content',
  });
}
