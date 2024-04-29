// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

type SettingType = 'edit' | 'json' | 'check' | 'manual' | 'option' | 'int';

export const SETTING_TYPES: {
  init_cmds: SettingType,
  term_context: SettingType,
  pinned: SettingType,
  maximized: SettingType,
  opacity: SettingType,
  shortcuts: SettingType,
  devmode_tests: SettingType,
  devmode_ignore_comp_checks: SettingType,
  devmode_console_errors: SettingType,
  cmd_assistant_dyn_options_disabled: SettingType,
  cmd_assistant_match_mode: SettingType,
  cmd_assistant_max_results: SettingType,
} = {
  init_cmds: 'edit',
  term_context: 'json',
  pinned: 'check',
  maximized: 'check',
  opacity: 'int',
  shortcuts: 'manual',
  devmode_tests: 'check',
  devmode_ignore_comp_checks: 'check',
  devmode_console_errors: 'check',
  cmd_assistant_dyn_options_disabled: 'check',
  cmd_assistant_match_mode: 'option',
  cmd_assistant_max_results: 'int',
};

export const SETTING_NAMES: Array<string> = Array.from(Object.keys(SETTING_TYPES));

export type ExtensionSettings = {
  init_cmds: string,
  term_context: {[string]: mixed},
  pinned: boolean,
  maximized: boolean,
  opacity: number,
  shortcuts: {[string]: string},
  devmode_tests: boolean,
  devmode_ignore_comp_checks: boolean,
  devmode_console_errors: boolean,
  cmd_assistant_dyn_options_disabled: boolean,
  cmd_assistant_match_mode: 'includes' | 'startsWith',
  cmd_assistant_max_results: number,
};

export const SETTING_DEFAULTS: ExtensionSettings = {
  init_cmds: '',
  term_context: {active_test: false},
  pinned: false,
  maximized: false,
  opacity: 93,
  shortcuts: {},
  devmode_tests: false,
  devmode_ignore_comp_checks: false,
  devmode_console_errors: false,
  cmd_assistant_dyn_options_disabled: false,
  cmd_assistant_match_mode: 'includes',
  cmd_assistant_max_results: 35,
};

export const IGNORED_KEYS: Array<string> = ['Control', 'Meta', 'Shift', 'Alt', 'Escape'];

export const COMPATIBLE_VERSIONS: Array<string> = [
  '11.',
  'saas~11',
  '12.',
  'saas~12',
  '13.',
  'saas~13',
  '14.',
  'saas~14',
  '15.',
  'saas~15',
  '16.',
  'saas~16',
  '17.0',
  'saas~17.0',
];
