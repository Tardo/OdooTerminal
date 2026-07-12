// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {signal, type Signal} from '@preact/signals';
import {ubrowser} from '@shared/constants';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {SETTING_DEFAULTS, SETTING_NAMES} from '@common/constants';

async function loadThemeValues(theme: string): Promise<any> {
  const url = ubrowser.runtime.getURL(`themes/${theme}.json`);
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load theme '${theme}': ${resp.status}`);
  }
  return resp.json();
}

export type SettingsStore = {
  settings: Signal<any>,
  loading: Signal<boolean>,
  hasChanges: Signal<boolean>,
  load: () => Promise<void>,
  saveSettings: () => Promise<void>,
  resetSettings: () => Promise<void>,
  loadThemeValues: (string) => Promise<any>,
  checkChanges: () => void,
  // Signals are shallow; mutate() applies edits in place then reassigns a
  // shallow copy so subscribers re-render. Use it for every settings edit.
  mutate: ((any) => void) => void,
};

export function useSettings(): SettingsStore {
  const settings = signal<{[string]: any}>({...SETTING_DEFAULTS});
  const loading = signal<boolean>(true);
  const hasChanges = signal<boolean>(false);

  let snapshot: string | null = null;

  function mutate(updater: (any) => void) {
    const draft = settings.value;
    updater(draft);
    settings.value = {...draft};
  }

  function takeSnapshot() {
    snapshot = JSON.stringify(settings.value);
  }

  function checkChanges() {
    hasChanges.value = JSON.stringify(settings.value) !== snapshot;
  }

  async function load() {
    loading.value = true;
    try {
      const values = await getStorageSync(SETTING_NAMES);
      const next = {...settings.value};
      for (const name of SETTING_NAMES) {
        if (typeof values[name] !== 'undefined') {
          next[name] = values[name];
        }
      }
      // Ensure array-type settings are always arrays (migration from older versions)
      if (!Array.isArray(next.ai_models)) next.ai_models = [];
      if (!Array.isArray(next.ai_custom_skills)) next.ai_custom_skills = [];
      settings.value = next;
      takeSnapshot();
      hasChanges.value = false;
    } finally {
      loading.value = false;
    }
  }

  async function saveSettings() {
    const data = {};
    for (const name of SETTING_NAMES) {
      data[name] = JSON.parse(JSON.stringify(settings.value[name]));
    }
    await setStorageSync(data);
    takeSnapshot();
    hasChanges.value = false;
  }

  async function resetSettings() {
    await setStorageSync(SETTING_DEFAULTS);
    settings.value = {...SETTING_DEFAULTS};
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
    mutate,
  };
}
