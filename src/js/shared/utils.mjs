// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ubrowser} from "./globals.mjs";

/**
 * Helper function to inject an script.
 * @param {String} script - The URL
 * @param {Function} callback - The function to call when scripts loads
 */
export function injectPageScript(doc, script, callback) {
  const script_page = doc.createElement("script");
  const [script_ext] = script.split(".").slice(-1);
  if (script_ext === "mjs") {
    script_page.setAttribute("type", "module");
  } else {
    script_page.setAttribute("type", "text/javascript");
  }
  (doc.head || doc.documentElement).appendChild(script_page);
  if (callback) {
    script_page.onload = callback;
  }
  script_page.src = ubrowser.extension.getURL(script);
}

/**
 * Helper function to inject an css.
 * @param {String} css - The URL
 */
export function injectPageCSS(doc, css) {
  const link_page = doc.createElement("link");
  link_page.setAttribute("rel", "stylesheet");
  link_page.setAttribute("type", "text/css");
  (doc.head || doc.documentElement).appendChild(link_page);
  link_page.href = ubrowser.extension.getURL(css);
}

/**
 * Helper function to inject multiple file types.
 * @param {Object} files - Files by type to inject
 */
export function injector(doc, files) {
  let files_len = files.css.length;
  for (let x = 0; x < files_len; ++x) {
    injectPageCSS(doc, files.css[x]);
  }
  files_len = files.js.length;
  for (let x = 0; x < files_len; ++x) {
    injectPageScript(doc, files.js[x]);
  }
}

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
