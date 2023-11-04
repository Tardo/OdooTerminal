// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isCompatibleOdooVersion from '@common/utils/is_compatible_odoo_version';
import postMessage from '@common/utils/post_message';
import getOdooVersion from '@odoo/utils/get_odoo_version';

const ODOO_OBJ = window.odoo;

/**
 * Helper function to sanitize the server version.
 * @param {String} ver - Odoo version
 * @param {Array} ver_info - Odoo version info
 * @returns {Object}
 */
function sanitizeServerInfo(ver, ver_info) {
  const info = {};
  info.serverVersionRaw = ver;
  info.serverVersionInfo = ver_info;
  if (ver_info) {
    info.serverVersion = {
      major: ver_info[0],
      minor: ver_info[1],
      status: ver_info[2],
      statusLevel: ver_info[3],
    };
  } else {
    const foundVer = info.serverVersionRaw.match(
      /(\d+)\.(\d+)(?:([a-z]+)(\d*))?/,
    );
    if (foundVer && foundVer.length) {
      info.serverVersion = {
        major: Number(foundVer[1]),
        minor: Number(foundVer[2]),
        status: foundVer[3],
        statusLevel: foundVer[4] && Number(foundVer[4]),
      };
    }
  }
  return info;
}

/**
 * @returns {Promise}
 */
async function getOdooVersionByNetwork() {
  const response = await fetch('/web/webclient/version_info', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (response.status === 200) {
    const json_data = await response.json();
    return sanitizeServerInfo(
      json_data.result.server_version,
      json_data.result.server_version_info,
    );
  }
  throw new Error(response);
}

/**
 * Request to Odoo the version.
 * @returns {Object}
 */
async function getInstanceVersion() {
  let server_ver = getOdooVersion();
  if (server_ver) {
    server_ver = sanitizeServerInfo(server_ver);
  } else {
    server_ver = await getOdooVersionByNetwork();
  }
  return server_ver;
}

const icontext = {
  isOdoo: false,
  isCompatible: false,
};
if (ODOO_OBJ) {
  icontext.isOdoo = true;
  Object.assign(icontext, await getInstanceVersion());
  icontext.isCompatible = isCompatibleOdooVersion(icontext.serverVersionRaw);
}
postMessage('ODOO_TERM_INIT', {
  instance_info: icontext,
});
