// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ubrowser} from "./constants.mjs";

/**
 * @param {Number} tab_id
 * @param {String} message
 */
export function sendInternalMessage(tab_id, message) {
  ubrowser.tabs.sendMessage(tab_id, {message: message});
}

export function getActiveTab() {
  return new Promise((resolve, reject) => {
    ubrowser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (ubrowser.runtime?.lastError || !tabs.length) {
        reject(ubrowser.runtime?.lastError);
      } else {
        resolve(tabs[0]);
      }
    });
  });
}
