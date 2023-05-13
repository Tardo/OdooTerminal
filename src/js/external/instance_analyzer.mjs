// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {isCompatibleOdooVersion} from "../common/utils.mjs";

class InstanceAnalyzer {
  get odoo() {
    return window.odoo;
  }
  get odoo_session() {
    return (
      this.odoo.session_info ||
      this.odoo.session ||
      this.odoo.__DEBUG__.services["web.session"]
    );
  }

  run() {
    return this.getInfo().then((info) => {
      window.postMessage(
        {
          type: "ODOO_TERM_INIT",
          instance_info: info,
        },
        "*"
      );
    });
  }

  /**
   * @returns {Object}
   */
  async getInfo() {
    if (!this.odoo) {
      return {
        isOdoo: false,
        isCompatible: false,
      };
    }

    const icontext = {
      isOdoo: true,
    };
    let need_request_server_version = true;
    if (this.odoo_session) {
      icontext.isBackOffice = !this.odoo_session.is_frontend;
      if (this.odoo_session.server_version) {
        Object.assign(
          icontext,
          this.#sanitizeServerInfo(this.odoo_session.server_version)
        );
        need_request_server_version = false;
      }
    }
    if (!icontext.isBackOffice) {
      icontext.isBackOffice = this.#isBackOfficeMode();
    }
    if (need_request_server_version) {
      Object.assign(icontext, await this.#getInstanceVersion());
    }
    icontext.isCompatible = isCompatibleOdooVersion(icontext.serverVersionRaw);
    return icontext;
  }

  /**
   * Helper function to sanitize the server version.
   * @param {String} ver - Odoo version
   * @param {Array} ver_info - Odoo version info
   * @returns {Object}
   */
  #sanitizeServerInfo(ver, ver_info) {
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
        /(\d+)\.(\d+)(?:([a-z]+)(\d*))?/
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
  #getOdooVersionByFramework() {
    return new Promise((resolve, reject) => {
      try {
        this.odoo.define(0, (require) => {
          require("web.core");
          const session = require("web.session");
          if (session?.server_version) {
            resolve(this.#sanitizeServerInfo(session.server_version));
          } else {
            reject();
          }
        });
      } catch (exception) {
        reject();
      }
    });
  }

  /**
   * @returns {Promise}
   */
  async #getOdooVersionByNetwork() {
    const response = await fetch("/web/webclient/version_info", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (response.status === 200) {
      const json_data = await response.json();
      return this.#sanitizeServerInfo(
        json_data.result.server_version,
        json_data.result.server_version_info
      );
    }
    throw new Error(response);
  }

  /**
   * Request to Odoo the version.
   * @returns {Object}
   */
  async #getInstanceVersion() {
    let server_ver = null;
    try {
      server_ver = await this.#getOdooVersionByFramework();
    } catch (exc_a) {
      try {
        server_ver = await this.#getOdooVersionByNetwork();
      } catch (exc_b) {
        // Do nothing
      }
    }
    return server_ver;
  }

  /**
   * Heuristic method to determine back-office mode
   * @returns {Boolean}
   */
  #isBackOfficeMode() {
    return (
      document.querySelector("head script[src*='assets_frontend']") === null
    );
  }
}

const analyzer = new InstanceAnalyzer();
analyzer.run();

export default analyzer;
