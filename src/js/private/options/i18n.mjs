// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18next from 'i18next';
import HttpApi from 'i18next-http-backend';
import {signal} from '@preact/signals';

const SUPPORTED = ['en', 'es', 'zh'];

// Components call t() during render; reading tick.value subscribes the
// component to language changes, so bumping it after a switch forces every
// dependent component to re-render — i18next is not reactive on its own.
const tick = signal(0);

function resolveLng(lang: ?string): string {
  if (!lang || lang === 'auto') {
    const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
    const base = nav.split('-')[0];
    return SUPPORTED.indexOf(base) !== -1 ? base : 'en';
  }
  return lang;
}

// options page lives at src/html/options.html, so a relative loadPath would be
// wrong — resolve via the runtime URL of the extension root instead.
function backendRequest(_options: any, url: string, _payload: any, callback: (any, any) => void) {
  const fileUrl = chrome.runtime.getURL(`_locales/${url}/translation.json`);
  fetch(fileUrl)
    .then((r) => r.json())
    .then((data) => callback(null, {status: 200, data}))
    .catch((err) => callback(err));
}

let initPromise: Promise<any> | null = null;

export async function initI18n(lang: ?string) {
  if (initPromise) return initPromise;
  const lng = resolveLng(lang);
  initPromise = i18next.use(HttpApi).init({
    lng,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED,
    load: 'languageOnly',
    debug: false,
    backend: {
      loadPath: '{{lng}}',
      request: backendRequest,
    },
  });
  await initPromise;
  tick.value++;
  return initPromise;
}

export async function changeLanguage(lang: ?string) {
  await initI18n(lang);
  const lng = resolveLng(lang);
  if (i18next.language !== lng) {
    await i18next.changeLanguage(lng);
  }
  tick.value++;
}

export function t(key: string, fallback?: string, options?: any): string {
  // eslint-disable-next-line no-unused-expressions
  tick.value; // track reactive dependency so language changes re-render
  if (i18next.isInitialized) {
    // i18next-extract-disable-next-line
    const val = i18next.t(key, options);
    if (val && val !== key) return val;
  }
  return fallback || key;
}
