// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import getOdooSession from './get_odoo_session';

export default function (): $ReadOnlyArray<string> | void {
  const serv_info = getOdooSession()?.server_version_info;
  // $FlowFixMe[invalid-compare]
  if (serv_info === null || !(serv_info instanceof Array)) {
    // Frontend pages (Odoo 17-19) don't have it in the session: rebuild it from the instance analyzer info
    const ver = window.__OdooTerminal?.raw_server_info?.serverVersion;
    if (!ver) {
      return;
    }
    return [ver.major, ver.minor, 0, ver.status || 'final', ver.statusLevel || 0, ''].map(String);
  }
  return serv_info;
}
