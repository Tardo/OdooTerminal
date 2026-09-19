// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import checkStorageError from '@terminal/utils/check_storage_error';

export type SessionStorageSetItemError = (error: string) => void;

export function getStorageItem<T>(item: string, def_value: T): T {
  const res = sessionStorage.getItem(item);
  if (typeof res === 'undefined' || res === null) {
    return def_value;
  }
  return JSON.parse(res);
}

export function setStorageItem(item: string, value: mixed, on_error?: SessionStorageSetItemError): boolean {
  try {
    // $FlowFixMe[incompatible-type]
    sessionStorage.setItem(item, JSON.stringify(value));
  } catch (err) {
    const err_check = checkStorageError(err);
    if (on_error && err_check) {
      on_error(err_check);
    }
    return false;
  }

  return true;
}

export function removeStorageItem(item: string): boolean {
  try {
    sessionStorage.removeItem(item);
  } catch (_err) {
    return false;
  }
  return true;
}
