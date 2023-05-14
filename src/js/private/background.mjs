// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/**
 * This script is used to update the extension browser icon and handle the
 * 'click' event to send the 'toggle' event to the terminal widget.
 *
 * Sends the internal message 'update_odoo_terminal_info' to 'content script'
 * and the 'content script' reply with the internal message
 * 'update_terminal_badge_info'.
 */

import {ubrowser} from "../shared/globals.mjs";
import {
  getActiveTab,
  getStorageSync,
  sendInternalMessage,
  setStorageSync,
} from "../shared/utils.mjs";
import {SETTING_DEFAULTS, SETTING_NAMES} from "../common/globals.mjs";

class ExtensionBackground {
  constructor() {
    this.#handleEvents();
  }

  /**
   * @param {String} icon - url to the icon
   * @param {String} text - badge text
   * @param {String} bg_color - badge background color
   */
  #updateBrowserAction(icon, text = null, bg_color = null) {
    ubrowser.browserAction.setIcon({path: `../../img/${icon}`});
    ubrowser.browserAction.setBadgeText({
      text: text,
    });
    if (bg_color) {
      ubrowser.browserAction.setBadgeBackgroundColor({
        color: bg_color,
      });
    }
  }

  /**
   * @param {Object} request
   */
  #onMessage(request) {
    if (request.message === "update_terminal_badge_info") {
      const context = request.context;
      const icon = context.isCompatible
        ? "terminal-16.png"
        : "terminal-disabled-16.png";
      const color = context.isCompatible ? "#71639e" : "#878787";
      this.#updateBrowserAction(icon, context.serverVersionRaw, color);
    }
  }

  #onInstalled() {
    getStorageSync(SETTING_NAMES).then((items) => {
      const to_update = {};
      for (const setting_name of SETTING_NAMES) {
        if (
          typeof items[setting_name] === "undefined" &&
          typeof SETTING_DEFAULTS[setting_name] !== "undefined"
        ) {
          to_update[setting_name] = SETTING_DEFAULTS[setting_name];
        }
      }
      setStorageSync(to_update);
    });
  }

  #onRefreshOdooInfo(from_update) {
    // Because the script may be unavailable, we always assume
    // that the page is not compatible with the extension.
    this.#updateBrowserAction("terminal-disabled-16.png");
    // Query for active tab
    getActiveTab().then((tab) => {
      if (tab.status === "complete") {
        if (from_update) {
          // Request Odoo Info, wait 'idle' delay
          setTimeout(() => {
            sendInternalMessage(tab.id, "update_odoo_terminal_info");
          }, 150);
        } else {
          sendInternalMessage(tab.id, "update_odoo_terminal_info");
        }
      }
    });
  }

  /**
   * @param {Object} tab - The active tab
   */
  #onClickBrowserAction(tab) {
    sendInternalMessage(tab.id, "toggle_terminal");
  }

  #handleEvents() {
    // Listen 'content script' reply with the collected information
    ubrowser.runtime.onMessage.addListener(this.#onMessage.bind(this));
    // Listen 'installed' event to set default settings
    ubrowser.runtime.onInstalled.addListener(this.#onInstalled.bind(this));

    // Listen actived tab and updates to update info
    ubrowser.tabs.onUpdated.addListener(
      this.#onRefreshOdooInfo.bind(this, true)
    );
    ubrowser.tabs.onActivated.addListener(
      this.#onRefreshOdooInfo.bind(this, false)
    );

    // Listen the extension browser icon click event to toggle terminal visibility
    ubrowser.browserAction.onClicked.addListener(
      this.#onClickBrowserAction.bind(this)
    );
  }
}
new ExtensionBackground();
