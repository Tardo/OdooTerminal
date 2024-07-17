// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import UnknownStoreValue from './exceptions/unknown_store_value';

export default class Frame {
  cmd: string | void;
  store: {[string]: mixed};
  args: Array<string>;
  values: Array<mixed>;
  prevFrame: Frame | void;
  lastFlowCheck: mixed | void;

  constructor(cmd_name: string | void, prev_frame: Frame | void) {
    this.cmd = cmd_name;
    this.store = {};
    this.args = [];
    this.values = [];
    this.prevFrame = prev_frame;
    this.lastFlowCheck = undefined;
  }

  getStoreValue(var_name: string): mixed {
    let cur_frame: Frame | void = this;
    while (typeof cur_frame !== 'undefined') {
      if (Object.hasOwn(cur_frame.store, var_name)) {
        return cur_frame.store[var_name];
      }
      cur_frame = cur_frame.prevFrame;
    }
    throw new UnknownStoreValue(var_name);
  }

  setStoreValue(var_name: string, value: mixed) {
    let cur_frame: Frame | void = this;
    let val_found = false;
    while (typeof cur_frame !== 'undefined') {
      if (Object.hasOwn(cur_frame.store, var_name)) {
        cur_frame.store[var_name] = value;
        val_found = true;
        break;
      }
      cur_frame = cur_frame.prevFrame;
    }
    if (!val_found) {
      this.store[var_name] = value;
    }
  }
}
