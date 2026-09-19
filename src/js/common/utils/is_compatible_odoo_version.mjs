// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {COMPATIBLE_VERSIONS} from '@common/constants';

export default function (version: string): boolean {
  if (!version) {
    // This can happens due to a service worker malfunction or by a modified controller
    return false;
  }
  return COMPATIBLE_VERSIONS.some(item => version.startsWith(item));
}
