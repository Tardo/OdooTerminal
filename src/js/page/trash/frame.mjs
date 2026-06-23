// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import UnknownStoreValue from './exceptions/unknown_store_value';

export default class Frame {
  cmd: string | void;
  locals: {[string]: mixed};
  args: Array<string>;
  stack: Array<mixed>;
  prevFrame: Frame | void;
  lastFlowCheck: mixed | void;

  constructor(cmd_name: string | void, prev_frame: Frame | void) {
    this.cmd = cmd_name;
    this.locals = {};
    this.args = [];
    this.stack = [];
    this.prevFrame = prev_frame;
    this.lastFlowCheck = undefined;
  }

  getLocal(var_name: string): mixed {
    let cur_frame: Frame | void = this;
    while (typeof cur_frame !== 'undefined') {
      if (Object.hasOwn(cur_frame.locals, var_name)) {
        return cur_frame.locals[var_name];
      }
      cur_frame = cur_frame.prevFrame;
    }
    throw new UnknownStoreValue(var_name);
  }

  setLocal(var_name: string, value: mixed) {
    let cur_frame: Frame | void = this;
    let val_found = false;
    while (typeof cur_frame !== 'undefined') {
      if (Object.hasOwn(cur_frame.locals, var_name)) {
        cur_frame.locals[var_name] = value;
        val_found = true;
        break;
      }
      cur_frame = cur_frame.prevFrame;
    }
    if (!val_found) {
      this.locals[var_name] = value;
    }
  }
}
