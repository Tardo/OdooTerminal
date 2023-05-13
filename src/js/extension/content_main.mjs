// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {getStorageSync, injectPageScript, injector} from "./utils.mjs";
import {InstanceContext, getResources, updateContext} from "./context.mjs";

import {ubrowser} from "./globals.mjs";
import {SETTING_NAMES} from "../common/globals.mjs";

class ExtensionContent {
  constructor() {
    this.#handleEvents();
  }

  /**
   * @param {Object} odoo_info - The collected information
   */
  #updateInstanceContext(odoo_info = {}) {
    if (typeof odoo_info !== "object") {
      return;
    }
    updateContext(odoo_info, {isLoaded: true});
  }

  /**
   * Listen messages from page context
   * @param {Object} event
   */
  #onWindowMessage(event) {
    // We only accept messages from ourselves
    if (event.source !== window) {
      return;
    }
    if (event.data.type === "ODOO_TERM_INIT") {
      var info = event.data.instance_info;
      this.#updateInstanceContext(info);
      if (info.isCompatible) {
        injector(document, getResources());
      } else if (info.isOdoo) {
        console.warn("[OdooTerminal] Incompatible server version!");
      }
    } else if (event.data.type === "ODOO_TERM_START") {
      // Load Init Commands
      getStorageSync(SETTING_NAMES).then((items) => {
        const data = {};
        for (const config_name in items) {
          data[config_name] = items[config_name];
        }
        window.postMessage(
          {
            type: "ODOO_TERM_CONFIG",
            config: data,
            info: InstanceContext,
          },
          "*"
        );
      });
    }
  }

  /**
   * Listen message from extension context
   * @param {Object} request
   */
  #onMessage(request) {
    if (request.message === "update_odoo_terminal_info") {
      if (InstanceContext.isLoaded) {
        this.#updateInstanceContext();
      } else {
        injectPageScript(
          document,
          "src/js/external/instance_analyzer.mjs",
          (ev) => {
            ev.target.parentNode.removeChild(ev.target);
          }
        );
      }
    } else if (request.message === "toggle_terminal") {
      if (InstanceContext.isCompatible) {
        document.getElementById("terminal").dispatchEvent(new Event("toggle"));
      }
    }
  }

  #handleEvents() {
    window.addEventListener("message", this.#onWindowMessage.bind(this), false);
    ubrowser.runtime.onMessage.addListener(this.#onMessage.bind(this));
  }
}

export const extension_content = new ExtensionContent();
