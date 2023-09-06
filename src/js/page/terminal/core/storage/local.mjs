// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import checkStorageError from '@terminal/utils/check_storage_error';

export function getStorageItem(item, def_value) {
  debugger;
  const res = localStorage.getItem(item);
  if (res === null) {
    return def_value;
  }
  return JSON.parse(res);
}

export function setStorageItem(item, value, on_error = false) {
  try {
    return localStorage.setItem(item, JSON.stringify(value));
  } catch (err) {
    const err_check = checkStorageError(err);
    if (on_error && err_check) {
      on_error(err_check);
    }
  }

  return false;
}

export function removeStorageItem(item) {
  return localStorage.removeItem(item) || undefined;
}
