// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import createStorage from './create_storage';
import type {JSONStorage} from './create_storage';

export const {getStorageItem, setStorageItem, removeStorageItem}: JSONStorage = createStorage(() => localStorage);
