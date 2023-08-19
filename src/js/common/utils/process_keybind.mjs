// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {IGNORED_KEYS} from "@common/constants.mjs";

/**
 * @param {Object} e
 * @returns {Array}
 */
export default function (e) {
  const keybind = [];
  if (e.altKey) {
    keybind.push("Alt");
  }
  if (e.ctrlKey) {
    keybind.push("Ctrl");
  }
  if (e.shiftKey) {
    keybind.push("Shift");
  }
  if (e.metaKey) {
    keybind.push("Meta");
  }
  if (IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
    keybind.push(e.key === " " ? "Space" : e.key);
  }
  return keybind;
}
