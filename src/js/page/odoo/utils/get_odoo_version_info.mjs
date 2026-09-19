// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooSession from './get_odoo_session';

export default function (): $ReadOnlyArray<string> | void {
  const serv_info = getOdooSession()?.server_version_info;
  // $FlowFixMe[invalid-compare]
  if (serv_info === null || !(serv_info instanceof Array)) {
    return window.__OdooTerminal?.raw_server_info.serverVersionInfo;
  }
  return serv_info;
}
