// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {ubrowser} from './constants';

export function sendInternalMessage(tab_id: number, message: mixed) {
  // Tabs without the content script (chrome://, extension pages like the options
  // page, PDF viewer...) reject with 'Receiving end does not exist'.
  ubrowser.tabs.sendMessage(tab_id, {message: message}).catch(() => undefined);
}

export function getActiveTab(): Promise<number> {
  return new Promise((resolve, reject) => {
    ubrowser.tabs.query({active: true, currentWindow: true}, tabs => {
      if (ubrowser.runtime?.lastError || !tabs.length) {
        reject(ubrowser.runtime?.lastError);
      } else {
        resolve(tabs[0]);
      }
    });
  });
}
