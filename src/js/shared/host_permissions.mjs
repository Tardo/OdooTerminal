// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ubrowser} from './constants';

/**
 * Reduces an arbitrary URL to a broad origin match pattern
 * (e.g. "https://api.openai.com/v1" -> "https://api.openai.com/*")
 * suitable for the WebExtension permissions API.
 */
export function urlToOriginPattern(url: string): ?string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch (_) {
    return null;
  }
}

// $FlowFixMe[unclear-type]
export function hasHostPermission(url: string): Promise<boolean> {
  const origin = urlToOriginPattern(url);
  if (origin === null) {
    return Promise.resolve(false);
  }
  return new Promise(resolve => {
    ubrowser.permissions.contains({origins: [origin]}, (granted: boolean) => {
      resolve(Boolean(granted) && !ubrowser.runtime?.lastError);
    });
  });
}

// $FlowFixMe[unclear-type]
export function requestHostPermission(url: string): Promise<boolean> {
  const origin = urlToOriginPattern(url);
  if (origin === null) {
    return Promise.resolve(false);
  }
  return new Promise((resolve, reject) => {
    ubrowser.permissions.request({origins: [origin]}, (granted: boolean) => {
      if (ubrowser.runtime?.lastError) {
        reject(ubrowser.runtime.lastError);
      } else {
        resolve(Boolean(granted));
      }
    });
  });
}
