// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {ubrowser} from './constants';

// $FlowFixMe[unclear-type]
export function getStorageSync(keys: $ReadOnlyArray<string>): Promise<Object> {
  return new Promise((resolve, reject) => {
    ubrowser.storage.sync.get(keys, items => {
      if (ubrowser.runtime?.lastError) {
        reject(ubrowser.runtime.lastError);
      } else {
        resolve(items);
      }
    });
  });
}

// $FlowFixMe[unclear-type]
export function setStorageSync(values: {...}): Promise<Object> {
  return new Promise((resolve, reject) => {
    ubrowser.storage.sync.set(values, items => {
      if (ubrowser.runtime?.lastError) {
        return reject(ubrowser.runtime.lastError);
      }
      resolve(items);
    });
  });
}
