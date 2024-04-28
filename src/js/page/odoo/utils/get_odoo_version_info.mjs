// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import getOdooSession from './get_odoo_session';

export default function (): $ReadOnlyArray<string> {
  const serv_info = getOdooSession()?.server_version_info;
  if (serv_info === null || !(serv_info instanceof Array)) {
    return window.__OdooTerminal?.raw_server_info.serverVersionInfo;
  }
  return serv_info;
}
