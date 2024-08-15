// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import checkStorageError from '@terminal/utils/check_storage_error';

export type LocalStorageSetItemError = (error: string) => void;

export function getStorageItem<T>(item: string, def_value: T): T {
  const res = localStorage.getItem(item);
  if (typeof res === 'undefined' || res === null) {
    return def_value;
  }
  return JSON.parse(res);
}

export function setStorageItem(item: string, value: mixed, on_error?: LocalStorageSetItemError): boolean {
  try {
    // $FlowIgnore
    localStorage.setItem(item, JSON.stringify(value));
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
    localStorage.removeItem(item);
  } catch (_err) {
    return false;
  }
  return true;
}
