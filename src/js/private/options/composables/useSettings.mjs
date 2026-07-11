// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {reactive, ref, toRaw} from 'vue';
import {ubrowser} from '@shared/constants';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {SETTING_DEFAULTS, SETTING_NAMES} from '@common/constants';

async function loadThemeValues(theme) {
  const url = ubrowser.runtime.getURL(`themes/${theme}.json`);
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load theme '${theme}': ${resp.status}`);
  }
  return resp.json();
}

export function useSettings() {
  const settings = reactive({...SETTING_DEFAULTS});
  const loading = ref(true);
  const hasChanges = ref(false);

  let snapshot = null;

  function takeSnapshot() {
    snapshot = JSON.stringify(settings);
  }

  function checkChanges() {
    hasChanges.value = JSON.stringify(settings) !== snapshot;
  }

  async function load() {
    loading.value = true;
    try {
      const values = await getStorageSync(SETTING_NAMES);
      for (const name of SETTING_NAMES) {
        if (typeof values[name] !== 'undefined') {
          settings[name] = values[name];
        }
      }
      // Ensure array-type settings are always arrays (migration from older versions)
      if (!Array.isArray(settings.ai_models)) settings.ai_models = [];
      if (!Array.isArray(settings.ai_custom_skills)) settings.ai_custom_skills = [];
      takeSnapshot();
      hasChanges.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings() {
    const data = {};
    for (const name of SETTING_NAMES) {
      // Use JSON parse/stringify to strip Vue reactivity proxies
      // so chrome.storage.sync can properly clone the values
      data[name] = JSON.parse(JSON.stringify(toRaw(settings[name])));
    }
    await setStorageSync(data);
    takeSnapshot();
    hasChanges.value = false;
  }

  async function resetSettings() {
    await setStorageSync(SETTING_DEFAULTS);
    for (const name of SETTING_NAMES) {
      settings[name] = SETTING_DEFAULTS[name];
    }
    takeSnapshot();
    hasChanges.value = false;
  }

  return {
    settings,
    loading,
    hasChanges,
    load,
    saveSettings,
    resetSettings,
    loadThemeValues,
    checkChanges,
  };
}
