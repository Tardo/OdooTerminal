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

import {ubrowser} from "../extension/globals.mjs";

import {SETTING_DEFAULTS, SETTING_NAMES} from "../common/globals.mjs";
import {getStorageSync, setStorageSync} from "../extension/utils.mjs";

class ExtensionBackground {
  #info_window_time = 0;

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
        ? "terminal-32.png"
        : "terminal-disabled-32.png";
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

  #onRefreshOdooInfo() {
    // Because the script may be unavailable, we always assume
    // that the page is not compatible with the extension.
    this.#updateBrowserAction("terminal-disabled-32.png");
    // Query for active tab
    ubrowser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length && tabs[0].status === "complete") {
        // Request Odoo Info, wait 'idle' delay
        setTimeout(() => {
          ubrowser.tabs.sendMessage(tabs[0].id, {
            message: "update_odoo_terminal_info",
          });
        }, 150);
      }
    });
  }

  /**
   * @param {Object} tab - The active tab
   */
  #onClickBrowserAction(tab) {
    ubrowser.tabs.sendMessage(tab.id, {
      message: "toggle_terminal",
    });
  }

  #handleEvents() {
    // Listen 'content script' reply with the collected information
    ubrowser.runtime.onMessage.addListener(this.#onMessage.bind(this));
    // Listen 'installed' event to set default settings
    ubrowser.runtime.onInstalled.addListener(this.#onInstalled.bind(this));

    // Listen actived tab and updates to update info
    ubrowser.tabs.onUpdated.addListener(this.#onRefreshOdooInfo.bind(this));
    ubrowser.tabs.onActivated.addListener(this.#onRefreshOdooInfo.bind(this));

    // Listen the extension browser icon click event to toggle terminal visibility
    ubrowser.browserAction.onClicked.addListener(
      this.#onClickBrowserAction.bind(this)
    );
  }
}
new ExtensionBackground();
