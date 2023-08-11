// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ubrowser} from "./constants.mjs";

/**
 * @param {String/Array} keys
 * @returns {Promise}
 */
export function getStorageSync(keys) {
  return new Promise((resolve, reject) => {
    ubrowser.storage.sync.get(keys, (items) => {
      if (ubrowser.runtime?.lastError) {
        reject(ubrowser.runtime.lastError);
      } else {
        resolve(items);
      }
    });
  });
}

/**
 * @param {Object} values
 * @returns {Promise}
 */
export function setStorageSync(values) {
  return new Promise((resolve, reject) => {
    ubrowser.storage.sync.set(values, (items) => {
      if (ubrowser.runtime?.lastError) {
        return reject(ubrowser.runtime.lastError);
      }
      resolve(items);
    });
  });
}
