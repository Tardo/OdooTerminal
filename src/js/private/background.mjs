// @flow strict
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

import {SETTING_DEFAULTS, SETTING_NAMES, VERSION_COLOR} from '@common/constants';
import sanitizeOdooVersion from '@common/utils/sanitize_odoo_version';
import {ubrowser} from '@shared/constants';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {sendInternalMessage} from '@shared/tabs';

/**
 * @param {String} icon - url to the icon
 * @param {String} text - badge text
 * @param {String} bg_color - badge background color
 */
function updateBrowserAction(icon: string, text: string | null, bg_color: string | null) {
  ubrowser.action.setIcon({path: `/src/img/${icon}.png`});
  ubrowser.action.setBadgeText({
    text: text,
  });
  if (bg_color !== null && bg_color !== '') {
    ubrowser.action.setBadgeBackgroundColor({
      color: bg_color,
    });
  }
}

// $FlowFixMe[unclear-type]
function onInternalMessage(request: Object, sender: Object) {
  if (request.message === 'update_terminal_badge_info') {
    const {context} = request;
    const ver_clean = sanitizeOdooVersion(context?.serverVersion?.raw);
    if (context.isCompatible) {
      ubrowser.action.enable(sender.tab.id);
      let color;
      if (context.isEnterprise) {
        color = 'enterprise';
      } else if (context.isSaas) {
        color = 'saas';
      } else {
        color = 'normal';
      }
      // $FlowFixMe[invalid-computed-prop]
      updateBrowserAction('terminal-16', ver_clean, VERSION_COLOR[color]);
    } else {
      ubrowser.action.disable(sender.tab.id);
      updateBrowserAction('terminal-disabled-16', ver_clean, VERSION_COLOR.disabled);
    }
  } else if (request.message === 'capture_screenshot') {
    const tabId: number = sender.tab.id;
    // $FlowFixMe[prop-missing]
    ubrowser.tabs.captureVisibleTab(null, {format: 'png'})
      .then((dataUrl: string) => {
        ubrowser.tabs.sendMessage(tabId, {message: 'screenshot_result', dataUrl});
      })
      .catch((err: Error) => {
        ubrowser.tabs.sendMessage(tabId, {message: 'screenshot_result', error: String(err.message || err)});
      });
  }
}

function onInstalled() {
  getStorageSync(SETTING_NAMES).then(items => {
    // $FlowFixMe[unclear-type]
    const to_update: Object = {};
    for (const setting_name of SETTING_NAMES) {
      // $FlowFixMe[invalid-computed-prop]
      if (typeof items[setting_name] === 'undefined' && typeof SETTING_DEFAULTS[setting_name] !== 'undefined') {
        // $FlowFixMe[invalid-computed-prop]
        to_update[setting_name] = SETTING_DEFAULTS[setting_name];
      }
    }
    setStorageSync(to_update);
  });
}

// $FlowFixMe[unclear-type]
function onTabUpdated(tab_id: number, change_info: Object) {
  if (change_info.status === 'complete') {
    // Request Odoo Info, wait 'idle' delay
    setTimeout(() => {
      sendInternalMessage(tab_id, 'update_odoo_terminal_info');
    }, 150);
  }
}

// $FlowFixMe[unclear-type]
function onTabActivated(active_info: Object) {
  // Because the script may be unavailable, we always assume
  // that the page is not compatible with the extension.
  ubrowser.action.disable(active_info.tabId);
  updateBrowserAction('terminal-disabled-16', null, null);
  sendInternalMessage(active_info.tabId, 'update_odoo_terminal_info');
}

// $FlowFixMe[unclear-type]
function onClickBrowserAction(tab: Object) {
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
ubrowser.action.onClicked.addListener(onClickBrowserAction);
