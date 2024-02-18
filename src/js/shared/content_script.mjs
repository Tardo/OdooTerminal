// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {SETTING_NAMES} from '@common/constants';
import postMessage from '@common/utils/post_message';
import {ubrowser} from './constants';
import {InstanceContext, getResources, updateContext} from './context';
import {injectPageScript, injector} from './injector';
import {getStorageSync, setStorageSync} from './storage';

/**
 * @param {Object} odoo_info - The collected information
 */
export function updateInstanceContext(odoo_info = {}) {
  if (typeof odoo_info !== 'object') {
    return;
  }
  updateContext(odoo_info, {isLoaded: true});
  ubrowser.runtime.sendMessage({
    message: 'update_terminal_badge_info',
    context: InstanceContext,
  });
}

/**
 * Listen messages from page context
 * @param {Object} event
 */
function onWindowMessage(event) {
  // We only accept messages from ourselves
  if (event.source !== window) {
    return;
  }
  if (event.data.type === 'ODOO_TERM_INIT') {
    const info = event.data.instance_info;
    getStorageSync(['devmode_ignore_comp_checks']).then(items => {
      if (items.devmode_ignore_comp_checks && info.isOdoo) {
        info.isCompatible = true;
        injector(document, getResources());
      } else if (info.isCompatible) {
        injector(document, getResources());
      } else if (info.isOdoo) {
        console.warn('Incompatible server version!');
      }
      updateInstanceContext(info);
    });
  } else if (event.data.type === 'ODOO_TERM_START') {
    // Load Init Commands
    getStorageSync(SETTING_NAMES).then(items => {
      postMessage('ODOO_TERM_CONFIG', {
        config: {...items},
        info: InstanceContext,
        langpath: ubrowser.extension.getURL('_locales/{{lng}}/{{ns}}.json'),
      });
    });
  } else if (event.data.type === 'ODOO_TERM_COPY') {
    // User by 'copy' command
    setStorageSync({
      terminal_copy_data: event.data.values,
    }).then(() => {
      postMessage('ODOO_TERM_COPY_DONE', {
        values: event.data.values,
      });
    });
  } else if (event.data.type === 'ODOO_TERM_PASTE') {
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
function onInternalMessage(request) {
  if (request.message === 'update_odoo_terminal_info') {
    if (InstanceContext.isLoaded) {
      updateInstanceContext();
    } else {
      injectPageScript(document, 'dist/pub/instance_analyzer.mjs', ev => {
        ev.target.parentNode.removeChild(ev.target);
      });
    }
  } else if (request.message === 'toggle_terminal') {
    if (InstanceContext.isCompatible) {
      document.getElementById('terminal').dispatchEvent(new Event('toggle'));
    }
  }
}

window.addEventListener('message', onWindowMessage, false);
ubrowser.runtime.onMessage.addListener(onInternalMessage);
