// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export const SETTING_TYPES = {
  init_cmds: "edit",
  term_context: "json",
  pinned: "check",
  maximized: "check",
  opacity: "int",
  shortcuts: "manual",
  devmode_tests: "check",
  devmode_ignore_comp_checks: "check",
  devmode_console_errors: "check",
};

export const SETTING_NAMES = Object.keys(SETTING_TYPES);

export const SETTING_DEFAULTS = {
  init_cmds: "",
  term_context: {active_test: false},
  pinned: false,
  maximized: false,
  opacity: 93,
  shortcuts: {},
  devmode_tests: false,
  devmode_ignore_comp_checks: false,
  devmode_console_errors: false,
};

export const IGNORED_KEYS = ["Control", "Meta", "Shift", "Alt", "Escape"];

export const COMPATIBLE_VERSIONS = [
  "11.",
  "saas~11",
  "12.",
  "saas~12",
  "13.",
  "saas~13",
  "14.",
  "saas~14",
  "15.",
  "saas~15",
  "16.0",
  "saas~16.0",
];
