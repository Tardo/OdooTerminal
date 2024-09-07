// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowFixMe
import '@css/options.css';
import processKeybind from '@common/utils/process_keybind';
import {ubrowser} from '@shared/constants';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {IGNORED_KEYS, SETTING_DEFAULTS, SETTING_NAMES, SETTING_TYPES} from '../common/constants.mjs';

let unique_counter: number = 1;
let shortcuts_defs: {[string]: string} = {};

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

function saveOptions() {
  const data: {[string]: mixed} = {};
  for (const name of SETTING_NAMES) {
    const type = SETTING_TYPES[name];
    if (type === 'manual') {
      continue;
    }
    const target = document.getElementById(name);
    if (target instanceof HTMLInputElement) {
      if (type === 'edit' || type === 'int' || type === 'option') {
        data[name] = target.value;
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
  setStorageSync(data);
}

function applyInputValues() {
  getStorageSync(SETTING_NAMES).then(result => {
    const cmd_names = Object.keys(result);
    for (const name of cmd_names) {
      // $FlowFixMe
      const type = SETTING_TYPES[name];
      if (type === 'manual') {
        continue;
      }
      const elm = document.getElementById(name);
      if (elm) {
        if (elm instanceof HTMLInputElement) {
          if (type === 'edit') {
            elm.value = result[name] || '';
          } else if (type === 'check') {
            elm.checked = result[name] || false;
          } else if (type === 'int') {
            elm.value = result[name] || 0;
          } else if (type === 'json') {
            elm.value = JSON.stringify(result[name] || {}, null, 4);
          }
        } else if (elm instanceof HTMLTextAreaElement) {
          if (type === 'edit') {
            elm.value = result[name] || '';
          } else if (type === 'json') {
            elm.value = JSON.stringify(result[name] || {}, null, 4);
          }
        } else if (elm instanceof HTMLSelectElement) {
          if (type === 'option') {
            // $FlowIgnore
            elm.value = result[name] || SETTING_DEFAULTS[name];
          }
        }
      }
    }
    shortcuts_defs = result.shortcuts || {};
    renderShortcutTable();
  });
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

function onClickResetSettings() {
  setStorageSync(SETTING_DEFAULTS);
  applyInputValues();
}

function _apply_i18n(selector: string, ikey: string) {
  const elm = document.querySelector(selector);
  if (elm) {
    elm.innerText = ubrowser.i18n.getMessage(ikey);
  }
}

function i18n() {
  document.title = ubrowser.i18n.getMessage('optionsTitle');

  _apply_i18n('#title_behaviour', 'optionsTitleBehaviour');
  _apply_i18n("label[for='pinned']", 'optionsTitleBehaviourPinned');
  _apply_i18n("label[for='maximized']", 'optionsTitleBehaviourMaximized');
  _apply_i18n("label[for='multiline']", 'optionsTitleBehaviourMultiline');
  _apply_i18n("label[for='opacity']", 'optionsTitleBehaviourOpacity');

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

  _apply_i18n('#reset_settings', 'optionsReset');
  _apply_i18n('#save_settings', 'optionsSave');
}

function onDOMLoaded() {
  applyInputValues();
  document.getElementById('form_options')?.addEventListener('submit', onSubmitForm);
  document.getElementById('shortcut_keybind')?.addEventListener('keydown', onKeyDownShortcut);
  document.getElementById('shortcut_keybind')?.addEventListener('keyup', onKeyUpShortcut);
  document.getElementById('add_shortcut')?.addEventListener('click', onClickShortcutAdd);
  document.getElementById('reset_settings')?.addEventListener('click', onClickResetSettings);
  i18n();
}

document.addEventListener('DOMContentLoaded', onDOMLoaded);
