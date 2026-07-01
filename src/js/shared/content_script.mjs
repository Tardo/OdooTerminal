// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {SETTING_NAMES} from '@common/constants';
import postMessage from '@common/utils/post_message';
import {ubrowser} from './constants';
import {InstanceContext, updateContext} from './context';
import type {Context} from './context';
import {injectPageScript, injector} from './injector';
import type {InjectorResources} from './injector';
import {getStorageSync, setStorageSync} from './storage';

const LOADER_RESOURCES: InjectorResources = {
  js: ['dist/pub/loader.mjs'],
};

export function updateInstanceContext(odoo_info?: Context) {
  updateContext(odoo_info || {}, {isLoaded: true});
  ubrowser.runtime.sendMessage({
    message: 'update_terminal_badge_info',
    context: InstanceContext,
  });
}

/**
 * Listen messages from page context
 * @param {Object} event
 */
function onWindowMessage(event: MessageEvent) {
  // We only accept messages from ourselves
  if (event.source !== window || event.data === null || typeof event.data !== 'object') {
    return;
  }
  // $FlowFixMe[unclear-type]
  const ev_data: Object = {...event.data};
  if (ev_data.type === 'ODOO_TERM_INIT') {
    const info = ev_data.instance_info;
    getStorageSync(['devmode_ignore_comp_checks']).then(items => {
      if (info.isCompatible || (items.devmode_ignore_comp_checks && info.isOdoo)) {
        info.isCompatible = true;
        injector(document, LOADER_RESOURCES);
      } else if (info.isOdoo) {
        console.warn('Incompatible server version!');
      }
      updateInstanceContext(info);
    });
  } else if (ev_data.type === 'ODOO_TERM_START') {
    // Load Init Commands
    getStorageSync(SETTING_NAMES).then(items => {
      postMessage('ODOO_TERM_CONFIG', {
        config: {...items},
        info: InstanceContext,
        langpath: decodeURI(ubrowser.runtime.getURL('_locales/{{lng}}/{{ns}}.json')),
      });
    });
  } else if (ev_data.type === 'ODOO_TERM_COPY') {
    // User by 'copy' command
    setStorageSync({
      terminal_copy_data: ev_data.values,
    }).then(() => {
      postMessage('ODOO_TERM_COPY_DONE', ev_data.values);
    });
  } else if (ev_data.type === 'ODOO_TERM_PASTE') {
    // User by 'paste' command
    getStorageSync(['terminal_copy_data']).then(items => {
      postMessage('ODOO_TERM_PASTE_DONE', items.terminal_copy_data);
    });
  } else if (ev_data.type === 'ODOO_TERM_SCREENSHOT_REQ') {
    ubrowser.runtime.sendMessage({message: 'capture_screenshot'});
  } else if (ev_data.type === 'ODOO_TERM_OPEN_OPTIONS') {
    ubrowser.runtime.sendMessage({message: 'open_options_page'});
  } else if (ev_data.type === 'ODOO_TERM_AI_CHECK_PERMISSION') {
    ubrowser.runtime.sendMessage({message: 'ai_check_permission', requestId: ev_data.requestId, url: ev_data.url});
  } else if (ev_data.type === 'ODOO_TERM_AI_FETCH_START') {
    ubrowser.runtime.sendMessage({
      message: 'ai_fetch_start',
      requestId: ev_data.requestId,
      url: ev_data.url,
      method: ev_data.method,
      headers: ev_data.headers,
      body: ev_data.body,
    });
  } else if (ev_data.type === 'ODOO_TERM_AI_FETCH_ABORT') {
    ubrowser.runtime.sendMessage({message: 'ai_fetch_abort', requestId: ev_data.requestId});
  }
}

/**
 * Listen message from extension context
 * @param {Object} request
 */
// $FlowFixMe[unclear-type]
function onInternalMessage(request: Object) {
  if (request.message === 'update_odoo_terminal_info') {
    if (InstanceContext.isLoaded) {
      updateInstanceContext();
    } else {
      injectPageScript(document, 'dist/pub/instance_analyzer.mjs', (ev: Event) => {
        if (ev.target instanceof Element) {
          ev.target.parentNode?.removeChild(ev.target);
        }
      });
    }
  } else if (request.message === 'toggle_terminal') {
    if (InstanceContext.isCompatible) {
      document.getElementById('terminal')?.dispatchEvent(new Event('toggle'));
    }
  } else if (request.message === 'screenshot_result') {
    postMessage('ODOO_TERM_SCREENSHOT_DONE', {
      dataUrl: request.dataUrl !== undefined ? request.dataUrl : null,
      error: request.error !== undefined ? request.error : null,
    });
  } else if (request.message === 'ai_permission_result') {
    postMessage('ODOO_TERM_AI_PERMISSION_RESULT', {requestId: request.requestId, granted: request.granted});
  } else if (request.message === 'ai_fetch_headers') {
    postMessage('ODOO_TERM_AI_FETCH_HEADERS', {
      requestId: request.requestId,
      ok: request.ok,
      status: request.status,
      statusText: request.statusText,
    });
  } else if (request.message === 'ai_fetch_chunk') {
    postMessage('ODOO_TERM_AI_FETCH_CHUNK', {requestId: request.requestId, chunk: request.chunk});
  } else if (request.message === 'ai_fetch_error_body') {
    postMessage('ODOO_TERM_AI_FETCH_ERROR_BODY', {requestId: request.requestId, text: request.text});
  } else if (request.message === 'ai_fetch_done') {
    postMessage('ODOO_TERM_AI_FETCH_DONE', {requestId: request.requestId});
  } else if (request.message === 'ai_fetch_error') {
    postMessage('ODOO_TERM_AI_FETCH_ERROR', {
      requestId: request.requestId,
      code: request.code,
      url: request.url,
      error: request.error,
    });
  } else if (request.message === 'ai_fetch_aborted') {
    postMessage('ODOO_TERM_AI_FETCH_ABORTED', {requestId: request.requestId});
  }
}

window.addEventListener('message', onWindowMessage, false);
ubrowser.runtime.onMessage.addListener(onInternalMessage);
