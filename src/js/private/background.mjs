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
import {hasHostPermission} from '@shared/host_permissions';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {sendInternalMessage} from '@shared/tabs';

// Requests in flight for the AI fetch relay, keyed by requestId, so 'ai_fetch_abort'
// can cancel the matching real network request.
const aiFetchControllers: Map<string, AbortController> = new Map();

// A MV3 service worker is torn down after a short idle window (no extension API
// activity). Slow/local AI backends (e.g. llama.cpp) can go 30+ seconds between
// stream chunks — especially with tool-calling, which some servers buffer instead
// of streaming token-by-token — so without this the worker dies mid-request, silently
// dropping the connection to the AI provider (the page is left waiting forever, since
// the worker never gets to send back an error). This timer pings a trivial extension
// API on an interval shorter than the idle window for as long as any AI fetch is
// in flight, to keep the worker alive until the request settles.
let aiKeepAliveTimer: IntervalID | null = null;

function startAIKeepAlive() {
  if (aiKeepAliveTimer !== null) {
    return;
  }
  aiKeepAliveTimer = setInterval(() => {
    ubrowser.runtime.getPlatformInfo(() => undefined);
  }, 20000);
}

function stopAIKeepAliveIfIdle() {
  if (aiKeepAliveTimer !== null && aiFetchControllers.size === 0) {
    clearInterval(aiKeepAliveTimer);
    aiKeepAliveTimer = null;
  }
}

function sendAIMessage(tabId: number, type: string, requestId: string, extra?: {[string]: mixed}) {
  ubrowser.tabs.sendMessage(tabId, {...(extra ?? {}), message: type, requestId});
}

/**
 * Performs the real network request to the AI provider from the privileged background
 * context, bypassing the page's CORS restrictions (the AI code runs injected into the
 * Odoo tab, so a direct fetch() there is subject to the target API's CORS policy).
 * Streams the decoded response back to the calling tab as a sequence of messages.
 */
// $FlowFixMe[unclear-type]
async function handleAIFetchStart(request: Object, tabId: number) {
  const {requestId, url, method, headers, body} = request;

  const allowed = await hasHostPermission(url);
  if (!allowed) {
    sendAIMessage(tabId, 'ai_fetch_error', requestId, {code: 'permission', url});
    return;
  }

  const controller = new AbortController();
  aiFetchControllers.set(requestId, controller);
  startAIKeepAlive();

  try {
    const response = await fetch(url, {method, headers, body, signal: controller.signal});

    sendAIMessage(tabId, 'ai_fetch_headers', requestId, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const text = await response.text();
      sendAIMessage(tabId, 'ai_fetch_error_body', requestId, {text});
      return;
    }

    if (!response.body) {
      sendAIMessage(tabId, 'ai_fetch_done', requestId);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value !== null && value !== undefined ? value : new Uint8Array(0), {stream: true});
      if (chunk) {
        sendAIMessage(tabId, 'ai_fetch_chunk', requestId, {chunk});
      }
    }
    sendAIMessage(tabId, 'ai_fetch_done', requestId);
  } catch (err) {
    if (err.name === 'AbortError') {
      sendAIMessage(tabId, 'ai_fetch_aborted', requestId);
    } else {
      sendAIMessage(tabId, 'ai_fetch_error', requestId, {code: 'network', error: String(err.message || err)});
    }
  } finally {
    aiFetchControllers.delete(requestId);
    stopAIKeepAliveIfIdle();
  }
}

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
  } else if (request.message === 'open_options_page') {
    ubrowser.runtime.openOptionsPage();
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
  } else if (request.message === 'ai_check_permission') {
    const tabId: number = sender.tab.id;
    hasHostPermission(request.url).then((granted: boolean) => {
      sendAIMessage(tabId, 'ai_permission_result', request.requestId, {granted});
    });
  } else if (request.message === 'ai_fetch_start') {
    handleAIFetchStart(request, sender.tab.id);
  } else if (request.message === 'ai_fetch_abort') {
    aiFetchControllers.get(request.requestId)?.abort();
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
