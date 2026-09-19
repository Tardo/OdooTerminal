// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {IGNORED_KEYS} from '@common/constants';

export default function (e: KeyboardEvent): Array<string> {
  const keybind = [];
  if (e.altKey) {
    keybind.push('Alt');
  }
  if (e.ctrlKey) {
    keybind.push('Ctrl');
  }
  if (e.shiftKey) {
    keybind.push('Shift');
  }
  if (e.metaKey) {
    keybind.push('Meta');
  }
  if (IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
    keybind.push(e.key === ' ' ? 'Space' : e.key);
  }
  return keybind;
}
