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

import {SETTING_DEFAULTS, SETTING_NAMES} from '@common/constants';
import {ubrowser} from '@shared/constants';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {sendInternalMessage} from '@shared/tabs';

/**
 * @param {String} icon - url to the icon
 * @param {String} text - badge text
 * @param {String} bg_color - badge background color
 */
function updateBrowserAction(icon, text = null, bg_color = null) {
  ubrowser.browserAction.setIcon({path: `/src/img/${icon}.png`});
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
function onInternalMessage(request, sender) {
  if (request.message === 'update_terminal_badge_info') {
    const {context} = request;
    if (context.isCompatible) {
      ubrowser.browserAction.enable(sender.tab.id);
      updateBrowserAction('terminal-16', context.serverVersionRaw, '#71639e');
    } else {
      ubrowser.browserAction.disable(sender.tab.id);
      updateBrowserAction(
        'terminal-disabled-16',
        context.serverVersionRaw,
        '#878787',
      );
    }
  }
}

function onInstalled() {
  getStorageSync(SETTING_NAMES).then(items => {
    const to_update = {};
    for (const setting_name of SETTING_NAMES) {
      if (
        typeof items[setting_name] === 'undefined' &&
        typeof SETTING_DEFAULTS[setting_name] !== 'undefined'
      ) {
        to_update[setting_name] = SETTING_DEFAULTS[setting_name];
      }
    }
    setStorageSync(to_update);
  });
}

function onTabUpdated(tab_id, change_info) {
  if (change_info.status === 'complete') {
    // Request Odoo Info, wait 'idle' delay
    setTimeout(() => {
      sendInternalMessage(tab_id, 'update_odoo_terminal_info');
    }, 150);
  }
}

function onTabActivated(active_info) {
  // Because the script may be unavailable, we always assume
  // that the page is not compatible with the extension.
  ubrowser.browserAction.disable(active_info.tabId);
  updateBrowserAction('terminal-disabled-16');
  sendInternalMessage(active_info.tabId, 'update_odoo_terminal_info');
}

/**
 * @param {Object} tab - The active tab
 */
function onClickBrowserAction(tab) {
  sendInternalMessage(tab.id, 'toggle_terminal');
}

// Listen 'content script' reply with the collected information
ubrowser.runtime.onMessage.addListener(onInternalMessage);
// Listen 'installed' event to set default settings
ubrowser.runtime.onInstalled.addListener(onInstalled);

// Listen actived tab and updates to update info
ubrowser.tabs.onUpdated.addListener(onTabUpdated);
ubrowser.tabs.onActivated.addListener(onTabActivated);

// Listen the extension browser icon click event to toggle terminal visibility
ubrowser.browserAction.onClicked.addListener(onClickBrowserAction);
