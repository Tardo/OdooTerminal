// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isCompatibleOdooVersion from '@common/utils/is_compatible_odoo_version';
import postMessage from '@common/utils/post_message';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {InstanceContext, updateContext} from '@shared/context'; // This is the page context! not the content context :)

type NetVersionInfo = [number, number, string, number];

const ODOO_OBJ: {...} = window.odoo;

/**
 * Helper function to sanitize the server version.
 */
function _updateContextServerInfo(ver: string, ver_info?: NetVersionInfo) {
  if (ver_info) {
    updateContext({
      serverVersion: {
        raw: ver,
        major: ver_info[0],
        minor: ver_info[1],
        status: ver_info[2],
        statusLevel: ver_info[3],
      },
    });
  } else {
    const foundVer = ver.match(/(\d+)\.(\d+)(?:([a-z]+)(\d*))?/);
    if (foundVer && foundVer.length) {
      updateContext({
        serverVersion: {
          raw: ver,
          major: Number(foundVer[1]),
          minor: Number(foundVer[2]),
          status: foundVer[3],
          statusLevel: foundVer[4] ? Number(foundVer[4]) : 0,
        },
      });
    }
  }
}

async function getOdooVersionByNetwork(): Promise<{
  server_version: string,
  server_version_info: NetVersionInfo,
}> {
  const response = await fetch('/web/webclient/version_info', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (response.status === 200) {
    const json_res = (await response.json()).result;
    return {
      server_version: json_res.server_version,
      server_version_info: json_res.server_version_info,
    };
  }
  throw new Error(response);
}

/**
 * Request to Odoo the version.
 */
async function updateContextServerInfo(): Promise<void> {
  const server_ver = getOdooVersion();
  if (typeof server_ver === 'string') {
    _updateContextServerInfo(server_ver);
  } else {
    const req_res = await getOdooVersionByNetwork();
    _updateContextServerInfo(req_res.server_version, req_res.server_version_info);
  }
}

if (ODOO_OBJ) {
  updateContextServerInfo().then(() => {
    if (InstanceContext.serverVersion) {
      const serv_raw = InstanceContext.serverVersion.raw;
      updateContext({
        isOdoo: true,
        isCompatible: isCompatibleOdooVersion(serv_raw),
        isSaas: serv_raw.startsWith('saas~'),
        isEnterprise: serv_raw.includes('+e'),
      });
    }
    postMessage('ODOO_TERM_INIT', {
      instance_info: InstanceContext,
    });
  });
} else {
  postMessage('ODOO_TERM_INIT', {
    instance_info: InstanceContext,
  });
}
