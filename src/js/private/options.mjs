// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import processKeybind from '@common/utils/process_keybind';
import '@css/options.css';
import {ubrowser} from '@shared/constants';
import {getStorageSync, setStorageSync} from '@shared/storage';
import {
  IGNORED_KEYS,
  SETTING_DEFAULTS,
  SETTING_NAMES,
  SETTING_TYPES,
} from '../common/constants.mjs';

let unique_counter = 1;
let shortcuts_defs = {};

function onClickShortcutRemove(e) {
  const row_target_id = e.target.dataset.target;
  const row = document.getElementById(row_target_id);
  row.parentNode.removeChild(row);
  const {keybind} = e.target.dataset;
  delete shortcuts_defs[keybind];
}

function renderShortcutTableItem(
  elm_shortcut_table,
  shortcut_keybind,
  shortcut_cmds,
) {
  const row_id = `shorcut-${unique_counter++}`;
  const tbody = elm_shortcut_table.getElementsByTagName('tbody')[0];
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
  const tbody = elm_shortcut_table.getElementsByTagName('tbody')[0];
  while (tbody.rows.length > 0) {
    tbody.deleteRow(0);
  }
  for (const shortcut_keybind in shortcuts_defs) {
    renderShortcutTableItem(
      elm_shortcut_table,
      shortcut_keybind,
      shortcuts_defs[shortcut_keybind],
    );
  }
}

function saveOptions() {
  const data = {};
  for (const name of SETTING_NAMES) {
    const type = SETTING_TYPES[name];
    if (type === 'manual') {
      continue;
    }
    const target = document.getElementById(name);
    let value = '';
    if (type === 'edit' || type === 'int' || type === 'option') {
      value = target.value;
    } else if (type === 'check') {
      value = target.checked;
    } else if (type === 'json') {
      value = JSON.parse(target.value);
    }
    data[name] = value;
  }
  data.shortcuts = shortcuts_defs;
  setStorageSync(data);
}

function applyInputValues() {
  getStorageSync(SETTING_NAMES).then(result => {
    const cmd_names = Object.keys(result);
    for (const name of cmd_names) {
      const type = SETTING_TYPES[name];
      if (type === 'manual') {
        continue;
      }
      const item = document.getElementById(name);
      if (type === 'edit') {
        item.value = result[name] || '';
      } else if (type === 'check') {
        item.checked = result[name] || false;
      } else if (type === 'int') {
        item.value = result[name] || 0;
      } else if (type === 'json') {
        item.value = JSON.stringify(result[name], null, 4) || '{}';
      } else if (type === 'option') {
        item.value = result[name] || null;
      }
    }
    shortcuts_defs = result.shortcuts || {};
    renderShortcutTable();
  });
}

function onSubmitForm(e) {
  e.preventDefault();
  saveOptions();
}

function onKeyDownShortcut(e) {
  const keybind = processKeybind(e);
  if (IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
    e.target.dataset.keybind = JSON.stringify(keybind);
    e.target.value = keybind.join(' + ');
  } else {
    e.target.dataset.keybind = '';
    if (keybind.length) {
      e.target.value = `${keybind.join(' + ')} + `;
    } else {
      e.target.value = '';
    }
  }
  e.preventDefault();
}

function onKeyUpShortcut(e) {
  if (!e.target.dataset.keybind) {
    e.target.value = '';
  }
}

function onClickShortcutAdd() {
  const elm_shortcut_keybind = document.getElementById('shortcut_keybind');
  const elm_shortcut_cmds = document.getElementById('shortcut_commands');
  if (elm_shortcut_keybind.value && elm_shortcut_cmds.value) {
    const elm_shortcut_table = document.getElementById('shorcut_table');
    shortcuts_defs[elm_shortcut_keybind.dataset.keybind] =
      elm_shortcut_cmds.value;
    renderShortcutTableItem(
      elm_shortcut_table,
      elm_shortcut_keybind.dataset.keybind,
      elm_shortcut_cmds.value,
    );
    elm_shortcut_keybind.value = '';
    elm_shortcut_cmds.value = '';
  }
}

function onClickResetSettings() {
  setStorageSync(SETTING_DEFAULTS);
  applyInputValues();
}

function i18n() {
  document.title = ubrowser.i18n.getMessage('optionsTitle');

  document.getElementById('title_behaviour').innerText =
    ubrowser.i18n.getMessage('optionsTitleBehaviour');
  document.querySelector("label[for='pinned']").innerText =
    ubrowser.i18n.getMessage('optionsTitleBehaviourPinned');
  document.querySelector("label[for='maximized']").innerText =
    ubrowser.i18n.getMessage('optionsTitleBehaviourMaximized');
  document.querySelector("label[for='opacity']").innerText =
    ubrowser.i18n.getMessage('optionsTitleBehaviourOpacity');

  document.getElementById('title_shortcuts').innerText =
    ubrowser.i18n.getMessage('optionsTitleShortcuts');
  document.getElementById('column_shortcuts_keybin').innerText =
    ubrowser.i18n.getMessage('optionsTitleShortcutsKeybind');
  document.getElementById('column_shortcuts_command').innerText =
    ubrowser.i18n.getMessage('optionsTitleShortcutsCommand');
  document.getElementById('add_shortcut').innerText = ubrowser.i18n.getMessage(
    'optionsTitleShortcutsAdd',
  );

  document.getElementById('title_command_assistant').innerText =
    ubrowser.i18n.getMessage('optionsTitleCommandAssistant');
  document.querySelector(
    "label[for='cmd_assistant_dyn_options_disabled']",
  ).innerText = ubrowser.i18n.getMessage(
    'optionsTitleCommandAssistantDynOptionsDisabled',
  );
  document.querySelector("label[for='cmd_assistant_match_mode']").innerText =
    ubrowser.i18n.getMessage('optionsTitleCommandAssistantMatchMode');
  document.querySelector("label[for='cmd_assistant_max_results']").innerText =
    ubrowser.i18n.getMessage('optionsTitleCommandAssistantMaxResults');

  document.getElementById('title_init_commands').innerText =
    ubrowser.i18n.getMessage('optionsTitleInitCommands');
  document.getElementById('desc_init_commands').innerText =
    ubrowser.i18n.getMessage('optionsTitleInitCommandsDescription');

  document.getElementById('title_terminal_context').innerText =
    ubrowser.i18n.getMessage('optionsTitleTerminalContext');
  document.getElementById('desc_terminal_context').innerText =
    ubrowser.i18n.getMessage('optionsTitleTerminalContextDescription');

  document.getElementById('title_developer_zone').innerText =
    ubrowser.i18n.getMessage('optionsTitleDeveloperZone');
  document.querySelector("label[for='devmode_tests']").innerText =
    ubrowser.i18n.getMessage('optionsTitleDeveloperZoneModeTests');
  document.querySelector("label[for='devmode_ignore_comp_checks']").innerText =
    ubrowser.i18n.getMessage('optionsTitleDeveloperZoneModeIgnoreCompChecks');
  document.querySelector("label[for='devmode_console_errors']").innerText =
    ubrowser.i18n.getMessage('optionsTitleDeveloperZoneModeConsoleErrors');

  document.getElementById('reset_settings').innerText =
    ubrowser.i18n.getMessage('optionsReset');
  document.getElementById('save_settings').innerText =
    ubrowser.i18n.getMessage('optionsSave');
}

function onDOMLoaded() {
  applyInputValues();
  document
    .getElementById('form_options')
    .addEventListener('submit', onSubmitForm);
  document
    .getElementById('shortcut_keybind')
    .addEventListener('keydown', onKeyDownShortcut);
  document
    .getElementById('shortcut_keybind')
    .addEventListener('keyup', onKeyUpShortcut);
  document
    .getElementById('add_shortcut')
    .addEventListener('click', onClickShortcutAdd);
  document
    .getElementById('reset_settings')
    .addEventListener('click', onClickResetSettings);
  i18n();
}

document.addEventListener('DOMContentLoaded', onDOMLoaded);
