// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';
import isEmpty from '@terminal/utils/is_empty';

const cache = {};
export default function () {
  if (!isEmpty(cache)) {
    return cache;
  }
  const raw =
    getOdooSession()?.server_version ||
    window.__OdooTerminal?.raw_server_info.serverVersionRaw;
  const is_sass = raw.contains('saas~');
  const raw_split = raw.replace('sass~', '').split('.');
  Object.assign(cache, {
    raw: raw,
    major: raw_split[0],
    minor: raw_split[1],
    is_saas: is_sass,
  });
  return cache;
}
