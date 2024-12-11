// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';
import sanitizeOdooVersion from '@common/utils/sanitize_odoo_version';
import isEmpty from '@trash/utils/is_empty';

export type OdooVersionInfo = {
  raw: string,
  major: number,
  minor: number,
};

const cache: Partial<OdooVersionInfo> = {};
export default function (type: 'raw' | 'major' | 'minor' = 'raw'): string | number | void {
  if (isEmpty(cache)) {
    let raw: string;
    const odoo_sess_ver = getOdooSession()?.server_version;
    if (odoo_sess_ver !== null && typeof odoo_sess_ver === 'string') {
      raw = odoo_sess_ver;
    } else {
      raw = window.__OdooTerminal?.raw_server_info.serverVersion.raw;
    }
    if (!raw) {
      return;
    }
    const raw_split = sanitizeOdooVersion(raw)?.split('.');
    if (raw_split) {
      Object.assign(cache, {
        raw: raw,
        major: Number(raw_split[0]),
        minor: Number(raw_split[1]),
      });
    } else {
      Object.assign(cache, {
        raw: raw,
        major: -1,
        minor: -1,
      });
    }
  }
  return cache[type];
}
