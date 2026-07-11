// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18next from 'i18next';
import HttpApi from 'i18next-http-backend';
import {reactive} from 'vue';

const SUPPORTED = ['en', 'es', 'zh'];

// Components call t() during render and read `tick`, so bumping it after a
// language change forces every dependent component to re-render with the new
// translations — without this, i18next is not reactive on its own.
const i18nState = reactive({tick: 0});

function resolveLng(lang) {
  if (!lang || lang === 'auto') {
    const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
    const base = nav.split('-')[0];
    return SUPPORTED.indexOf(base) !== -1 ? base : 'en';
  }
  return lang;
}

// options page lives at src/html/options.html, so a relative loadPath would be
// wrong — resolve via the runtime URL of the extension root instead.
function backendRequest(_options, url, _payload, callback) {
  const fileUrl = chrome.runtime.getURL(`_locales/${url}/translation.json`);
  fetch(fileUrl)
    .then((r) => r.json())
    .then((data) => callback(null, {status: 200, data}))
    .catch((err) => callback(err));
}

let initPromise = null;

export async function initI18n(lang) {
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
  i18nState.tick++;
  return initPromise;
  return initPromise;
}

export async function changeLanguage(lang) {
  await initI18n(lang);
  const lng = resolveLng(lang);
  if (i18next.language !== lng) {
    await i18next.changeLanguage(lng);
  }
  i18nState.tick++;
}

export function t(key, fallback, options) {
  // eslint-disable-next-line no-unused-expressions
  i18nState.tick; // track reactive dependency so language changes re-render
  if (i18next.isInitialized) {
    // i18next-extract-disable-next-line
    const val = i18next.t(key, options);
    if (val && val !== key) return val;
  }
  return fallback || key;
}
