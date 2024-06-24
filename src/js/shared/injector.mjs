// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ubrowser} from './constants.mjs';

export type InjectorResources = {
  js?: Array<string>,
  css?: Array<string>,
};
export type InjectorCallback = (ev: Event) => void;

/**
 * Helper function to inject an script.
 * @param {String} script - The URL
 * @param {Function} callback - The function to call when scripts loads
 */
export function injectPageScript(doc: Document, script: string, callback?: InjectorCallback) {
  const script_page = doc.createElement('script');
  const [script_ext] = script.split('.').slice(-1);
  if (script_ext === 'mjs') {
    script_page.setAttribute('type', 'module');
  } else {
    script_page.setAttribute('type', 'text/javascript');
  }
  (doc.head || doc.documentElement)?.appendChild(script_page);
  if (callback) {
    script_page.onload = callback;
  }
  script_page.src = ubrowser.runtime.getURL(script);
}

/**
 * Helper function to inject an css.
 * @param {String} css - The URL
 */
export function injectPageCSS(doc: Document, css: string) {
  const link_page = doc.createElement('link');
  link_page.setAttribute('rel', 'stylesheet');
  link_page.setAttribute('type', 'text/css');
  (doc.head || doc.documentElement)?.appendChild(link_page);
  link_page.href = ubrowser.runtime.getURL(css);
}

/**
 * Helper function to inject multiple file types.
 * @param {Object} files - Files by type to inject
 */
export function injector(doc: Document, files: InjectorResources) {
  files.css?.forEach(file => injectPageCSS(doc, file));
  files.js?.forEach(file => injectPageScript(doc, file));
}
