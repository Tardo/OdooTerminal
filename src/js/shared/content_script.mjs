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
  // $FlowFixMe
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
        langpath: ubrowser.extension.getURL('_locales/{{lng}}/{{ns}}.json'),
      });
    });
  } else if (ev_data.type === 'ODOO_TERM_COPY') {
    // User by 'copy' command
    setStorageSync({
      terminal_copy_data: ev_data.values,
    }).then(() => {
      postMessage('ODOO_TERM_COPY_DONE', {
        values: ev_data.values,
      });
    });
  } else if (ev_data.type === 'ODOO_TERM_PASTE') {
    // User by 'paste' command
    getStorageSync(['terminal_copy_data']).then(items => {
      postMessage('ODOO_TERM_PASTE_DONE', {
        values: items.terminal_copy_data,
      });
    });
  }
}

/**
 * Listen message from extension context
 * @param {Object} request
 */
function onInternalMessage(request: {message: string}) {
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
  }
}

window.addEventListener('message', onWindowMessage, false);
ubrowser.runtime.onMessage.addListener(onInternalMessage);
