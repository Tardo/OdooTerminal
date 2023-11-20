// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';
import isEmpty from '@terminal/utils/is_empty';

const cache = {};
export default function (type = 'raw') {
  if (isEmpty(cache)) {
    const raw =
      getOdooSession()?.server_version ||
      window.__OdooTerminal?.raw_server_info.serverVersionRaw;
    if (!raw) {
      return;
    }
    const raw_split = raw.replace('saas~', '').split('.');
    Object.assign(cache, {
      raw: raw,
      major: Number(raw_split[0]),
      minor: Number(raw_split[1]),
    });
  }
  return cache[type];
}
