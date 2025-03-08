// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowFixMe
import '@css/options.css';
import processKeybind from '@common/utils/process_keybind';
import {ubrowser} from '@shared/constants';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {IGNORED_KEYS, SETTING_DEFAULTS, SETTING_NAMES, SETTING_TYPES, THEMES} from '../common/constants.mjs';

// $FlowFixMe
export type EventCallback = (ev: any) => Promise<void> | void;

let unique_counter: number = 1;
let shortcuts_defs: {[string]: string} = {};
let color_domain_defs: {[string]: string} = {};

async function loadThemeValues(theme: string): Promise<{[string]: mixed}> {
  return new Promise((resolve, reject) => {
    ubrowser.runtime.getPackageDirectoryEntry((root) => {
      root.getFile(`themes/${theme}.json`, {}, (fileEntry) => {
        fileEntry.file((file) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onabort = reject;
          reader.onloadend = readerEvent => {
            // $FlowFixMe
            resolve(JSON.parse(readerEvent.target.result));
          };
          reader.readAsText(file);
        }, reject);
      }, reject);
    });
  });
}

function onClickShortcutRemove(e: MouseEvent) {
  if (e.target instanceof HTMLElement) {
    const el_target = e.target;
    const row_target_id = el_target.dataset.target;
    const row = document.getElementById(row_target_id);
    row?.parentNode?.removeChild(row);
    const {keybind} = el_target.dataset;
    delete shortcuts_defs[keybind];
  }
}

function onClickColorDomainRemove(e: MouseEvent) {
  if (e.target instanceof HTMLElement) {
    const el_target = e.target;
    const row_target_id = el_target.dataset.target;
    const row = document.getElementById(row_target_id);
    row?.parentNode?.removeChild(row);
    const {domain} = el_target.dataset;
    delete color_domain_defs[domain];
  }
}

function renderShortcutTableItem(tbody: HTMLTableSectionElement, shortcut_keybind: string, shortcut_cmds: string) {
  const row_id = `shorcut-${unique_counter++}`;
  const new_row = tbody.insertRow();
  const new_cell_keybind = new_row.insertCell(0);
  const new_cell_cmds = new_row.insertCell(1);
  const new_cell_options = new_row.insertCell(2);
  new_row.setAttribute('id', row_id);
  new_cell_keybind.innerText = JSON.parse(shortcut_keybind || '[]').join(' + ');
  new_cell_cmds.innerText = shortcut_cmds;
  const elm_link_remove = document.createElement('a');
  elm_link_remove.id = `${row_id}-remove'`;
  elm_link_remove.innerText = 'Remove';
  elm_link_remove.href = '#';
  elm_link_remove.classList.add('shortcut_remove');
  elm_link_remove.dataset.target = row_id;
  elm_link_remove.dataset.keybind = shortcut_keybind;
  new_cell_options.appendChild(elm_link_remove);
  elm_link_remove.addEventListener('click', onClickShortcutRemove, false);
}

function renderShortcutTable() {
  const elm_shortcut_table = document.getElementById('shorcut_table');
  const tbody = elm_shortcut_table?.getElementsByTagName('tbody')[0];
  if (tbody && tbody instanceof HTMLTableSectionElement) {
    while (tbody.rows.length > 0) {
      tbody.deleteRow(0);
    }
    for (const shortcut_keybind in shortcuts_defs) {
      renderShortcutTableItem(tbody, shortcut_keybind, shortcuts_defs[shortcut_keybind]);
    }
  }
}

function renderColorDomainTableItem(tbody: HTMLTableSectionElement, domain: string, color: string) {
  const row_id = `color-domain-${unique_counter++}`;
  const new_row = tbody.insertRow();
  const new_cell_domain = new_row.insertCell(0);
  const new_cell_color = new_row.insertCell(1);
  const new_cell_options = new_row.insertCell(2);
  new_row.setAttribute('id', row_id);
  new_cell_domain.innerText = domain;
  new_cell_color.innerText = color;
  const elm_link_remove = document.createElement('a');
  elm_link_remove.id = `${row_id}-remove'`;
  elm_link_remove.innerText = 'Remove';
  elm_link_remove.href = '#';
  elm_link_remove.classList.add('color_domain_remove');
  elm_link_remove.dataset.target = row_id;
  elm_link_remove.dataset.domain = domain;
  new_cell_options.appendChild(elm_link_remove);
  elm_link_remove.addEventListener('click', onClickColorDomainRemove, false);
}

function renderColorDomainTable() {
  const elm_color_domain_table = document.getElementById('color_domain_table');
  const tbody = elm_color_domain_table?.getElementsByTagName('tbody')[0];
  if (tbody && tbody instanceof HTMLTableSectionElement) {
    while (tbody.rows.length > 0) {
      tbody.deleteRow(0);
    }
    for (const color_domain_domain in color_domain_defs) {
      renderColorDomainTableItem(tbody, color_domain_domain, color_domain_defs[color_domain_domain]);
    }
  }
}

function saveOptions() {
  const data: {[string]: mixed} = {};
  for (const name of SETTING_NAMES) {
    // $FlowFixMe
    const type = SETTING_TYPES[name];
    if (type === 'manual') {
      continue;
    }
    const target = document.getElementById(name);
    if (target instanceof HTMLInputElement) {
      if (type === 'edit' || type === 'option' || type === 'color') {
        data[name] = target.value;
      } else if (type === 'int') {
        data[name] = Number(target.value);
      } else if (type === 'check') {
        data[name] = target.checked;
      } else if (type === 'json') {
        try {
          data[name] = JSON.parse(target.value);
        } catch (_err) {
          data[name] = '';
        }
      }
    } else if (target instanceof HTMLTextAreaElement) {
      if (type === 'json') {
        try {
          data[name] = JSON.parse(target.value);
        } catch (_err) {
          data[name] = '';
        }
      }
    } else if (target instanceof HTMLSelectElement) {
      if (type === 'option') {
        data[name] = target.value;
      }
    }
    if (typeof data[name] === 'undefined') {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        data[name] = target.value;
      } else {
        data[name] = '';
      }
    }
  }
  data.shortcuts = shortcuts_defs;
  data.colors_domain = color_domain_defs;
  setStorageSync(data);
}

function applyInputValues(values: {[string]: mixed}) {
  const cmd_names = Object.keys(values);
  for (const name of cmd_names) {
    // $FlowFixMe
    const type = SETTING_TYPES[name];
    if (type === 'manual') {
      continue;
    }
    const elm = document.getElementById(name);
    if (elm) {
      if (elm instanceof HTMLInputElement) {
        if ((type === 'edit' || type === 'color') && typeof values[name] === 'string') {
          elm.value = values[name] || '';
        } else if (type === 'check' && typeof values[name] === 'boolean') {
          elm.checked = values[name] || false;
        } else if (type === 'int' && (typeof values[name] === 'number' || typeof values[name] === 'string')) {
          elm.value = new String(values[name] || 0).toString();
        } else if (type === 'json' && typeof values[name] === 'object') {
          elm.value = JSON.stringify(values[name] || {}, null, 4);
        }
      } else if (elm instanceof HTMLTextAreaElement) {
        if (type === 'edit' && typeof values[name] === 'string') {
          elm.value = values[name] || '';
        } else if (type === 'json' && typeof values[name] === 'object') {
          elm.value = JSON.stringify(values[name] || {}, null, 4);
        }
      } else if (elm instanceof HTMLSelectElement) {
        if (type === 'option') {
          // $FlowIgnore
          elm.value = values[name] || SETTING_DEFAULTS[name];
        }
      }
    }
  }
  // $FlowFixMe
  shortcuts_defs = values.shortcuts || {};
  // $FlowFixMe
  color_domain_defs = values.colors_domain || {};
  renderShortcutTable();
  renderColorDomainTable();
}

function onSubmitForm(e: Event) {
  e.preventDefault();
  saveOptions();
}

function onKeyDownShortcut(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement) {
    const el_target = e.target;
    const keybind = processKeybind(e);
    if (IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
      el_target.dataset.keybind = JSON.stringify(keybind);
      el_target.value = keybind.join(' + ');
    } else {
      el_target.dataset.keybind = '';
      if (keybind.length) {
        el_target.value = `${keybind.join(' + ')} + `;
      } else {
        el_target.value = '';
      }
    }
  }
  e.preventDefault();
}

function onKeyUpShortcut(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement && !e.target.dataset.keybind) {
    e.target.value = '';
  }
}

function onClickShortcutAdd() {
  const elm_shortcut_keybind = document.getElementById('shortcut_keybind');
  const elm_shortcut_cmds = document.getElementById('shortcut_commands');
  if (
    elm_shortcut_keybind instanceof HTMLInputElement &&
    elm_shortcut_keybind.value &&
    elm_shortcut_cmds instanceof HTMLInputElement &&
    elm_shortcut_cmds.value
  ) {
    const elm_shortcut_table = document.getElementById('shorcut_table');
    shortcuts_defs[elm_shortcut_keybind.dataset.keybind] = elm_shortcut_cmds.value;
    const tbody = elm_shortcut_table?.getElementsByTagName('tbody')[0];
    if (tbody) {
      renderShortcutTableItem(tbody, elm_shortcut_keybind.dataset.keybind, elm_shortcut_cmds.value);
    }
    elm_shortcut_keybind.value = '';
    elm_shortcut_cmds.value = '';
  }
}

function onClickColorDomainAdd() {
  const elm_color_domain_domain = document.getElementById('color_domain_domain');
  const elm_color_domain_color = document.getElementById('color_domain_color');
  if (
    elm_color_domain_domain instanceof HTMLInputElement &&
    elm_color_domain_domain.value &&
    elm_color_domain_color instanceof HTMLInputElement &&
    elm_color_domain_color.value
  ) {
    const elm_color_domain_table = document.getElementById('color_domain_table');
    color_domain_defs[elm_color_domain_domain.value] = elm_color_domain_color.value;
    const tbody = elm_color_domain_table?.getElementsByTagName('tbody')[0];
    if (tbody) {
      renderColorDomainTableItem(tbody, elm_color_domain_domain.value, elm_color_domain_color.value);
    }
    elm_color_domain_domain.value = '';
    elm_color_domain_color.value = '';
  }
}

async function onClickResetSettings() {
  setStorageSync(SETTING_DEFAULTS);
  applyInputValues(await getStorageSync(SETTING_NAMES));
}

async function onChangeThemePreset(ev: Event) {
  // $FlowFixMe
  const theme_preset = ev.target.value;
  try {
    const theme_values = await loadThemeValues(theme_preset);
    applyInputValues(theme_values);
  } catch (e) {
    console.error('Failed to load theme values:', e);
  }
}

function _apply_i18n(selector: string, ikey: string) {
  const elms = document.querySelectorAll(selector);
  const text = ubrowser.i18n.getMessage(ikey);
  for (const elm of elms) {
    elm.innerText = text;
  }
}

function i18n() {
  document.title = ubrowser.i18n.getMessage('optionsTitle');

  _apply_i18n('#title_behaviour', 'optionsTitleBehaviour');
  _apply_i18n("label[for='pinned']", 'optionsTitleBehaviourPinned');
  _apply_i18n("label[for='maximized']", 'optionsTitleBehaviourMaximized');
  _apply_i18n("label[for='multiline']", 'optionsTitleBehaviourMultiline');
  _apply_i18n("label[for='elephant']", 'optionsTitleBehaviourElephant');
  _apply_i18n("label[for='language']", 'optionsLanguage');

  _apply_i18n('#title_theme', 'optionsTitleTheme');
  _apply_i18n("label[for='opacity']", 'optionsTitleThemeOpacity');
  _apply_i18n("label[for='fontsize']", 'optionsTitleThemeFontSize');
  _apply_i18n("label[for='fontsize_ca']", 'optionsTitleThemeFontSizeCA');
  _apply_i18n("label[for='fontfamily']", 'optionsTitleThemeFontFamily');
  _apply_i18n("label[for='color_primary']", 'optionsTitleThemeColorPrimary');
  _apply_i18n("label[for='color_secondary']", 'optionsTitleThemeColorSecondary');
  _apply_i18n("label[for='color_success']", 'optionsTitleThemeColorSuccess');
  _apply_i18n("label[for='color_danger']", 'optionsTitleThemeColorDanger');
  _apply_i18n("label[for='color_warning']", 'optionsTitleThemeColorWarning');
  _apply_i18n("label[for='color_info']", 'optionsTitleThemeColorInfo');
  _apply_i18n("label[for='color_light']", 'optionsTitleThemeColorLight');
  _apply_i18n("label[for='color_dark']", 'optionsTitleThemeColorDark');
  _apply_i18n("label[for='color_muted']", 'optionsTitleThemeColorMuted');
  _apply_i18n("label[for='color_white']", 'optionsTitleThemeColorWhite');
  _apply_i18n("label[for='color_domain_table']", 'optionsTitleThemeColorDomainTable');
  _apply_i18n('#column_color_domain_domain', 'optionsTitleThemeDomain');
  _apply_i18n('#column_color_domain_color', 'optionsTitleThemeColor');
  _apply_i18n('#add_color_domain', 'optionsTitleThemeAdd');

  _apply_i18n('#title_shortcuts', 'optionsTitleShortcuts');
  _apply_i18n('#column_shortcuts_keybin', 'optionsTitleShortcutsKeybind');
  _apply_i18n('#column_shortcuts_command', 'optionsTitleShortcutsCommand');
  _apply_i18n('#add_shortcut', 'optionsTitleShortcutsAdd');

  _apply_i18n('#title_command_assistant', 'optionsTitleCommandAssistant');
  _apply_i18n("label[for='cmd_assistant_dyn_options_disabled']", 'optionsTitleCommandAssistantDynOptionsDisabled');
  _apply_i18n("label[for='cmd_assistant_match_mode']", 'optionsTitleCommandAssistantMatchMode');
  _apply_i18n("label[for='cmd_assistant_max_results']", 'optionsTitleCommandAssistantMaxResults');

  _apply_i18n('#title_init_commands', 'optionsTitleInitCommands');
  _apply_i18n('#desc_init_commands', 'optionsTitleInitCommandsDescription');

  _apply_i18n('#title_terminal_context', 'optionsTitleTerminalContext');
  _apply_i18n('#desc_terminal_context', 'optionsTitleTerminalContextDescription');

  _apply_i18n('#title_developer_zone', 'optionsTitleDeveloperZone');
  _apply_i18n("label[for='devmode_tests']", 'optionsTitleDeveloperZoneModeTests');
  _apply_i18n("label[for='devmode_ignore_comp_checks']", 'optionsTitleDeveloperZoneModeIgnoreCompChecks');
  _apply_i18n("label[for='devmode_console_errors']", 'optionsTitleDeveloperZoneModeConsoleErrors');

  _apply_i18n('.reset_settings', 'optionsReset');
  _apply_i18n('.save_settings', 'optionsSave');
}

function _add_event_listener(selector: string, event_type: string, callback: EventCallback) {
  const elms = document.querySelectorAll(selector);
  for (const elm of elms) {
    elm.addEventListener(event_type, callback);
  }
}

async function onDOMLoaded() {
  const config_values = await getStorageSync(SETTING_NAMES);
  applyInputValues(config_values);

  _add_event_listener('#form_options', 'submit', onSubmitForm);
  _add_event_listener('#shortcut_keybind', 'keydown', onKeyDownShortcut);
  _add_event_listener('#shortcut_keybind', 'keyup', onKeyUpShortcut);
  _add_event_listener('#add_shortcut', 'click', onClickShortcutAdd);
  _add_event_listener('#add_color_domain', 'click', onClickColorDomainAdd);
  _add_event_listener('.reset_settings', 'click', onClickResetSettings);
  _add_event_listener('#theme_preset', 'change', onChangeThemePreset);
  i18n();
  for (const theme of THEMES) {
    const option = document.createElement('option');
    option.value = theme[0];
    option.textContent = theme[1];
    document.querySelector('#theme_preset')?.appendChild(option);
  }
}

document.addEventListener('DOMContentLoaded', onDOMLoaded);
