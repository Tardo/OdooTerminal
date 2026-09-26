// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import checkStorageError from '@terminal/utils/check_storage_error';

export type StorageSetItemError = (error: string) => void;
export type JSONStorage = {
  getStorageItem: <T>(item: string, def_value: T) => T,
  setStorageItem: (item: string, value: mixed, on_error?: StorageSetItemError) => boolean,
  removeStorageItem: (item: string) => boolean,
};

// Resolve storage at call time: accessing it can throw when browser storage is blocked.
export default function createStorage(getStorage: () => Storage): JSONStorage {
  return {
    getStorageItem<T>(item: string, def_value: T): T {
      const res = getStorage().getItem(item);
      return res === null || res === undefined ? def_value : JSON.parse(res);
    },
    setStorageItem(item: string, value: mixed, on_error?: StorageSetItemError): boolean {
      try {
        // $FlowFixMe[incompatible-type]
        getStorage().setItem(item, JSON.stringify(value));
      } catch (err) {
        const err_check = checkStorageError(err);
        if (on_error && err_check) on_error(err_check);
        return false;
      }
      return true;
    },
    removeStorageItem(item: string): boolean {
      try {
        getStorage().removeItem(item);
      } catch (_err) {
        return false;
      }
      return true;
    },
  };
}
