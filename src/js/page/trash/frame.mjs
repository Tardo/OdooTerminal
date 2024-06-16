// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default class Frame {
  cmd: string | void;
  store: {[string]: mixed};
  args: Array<string>;
  values: Array<mixed>;
  prevFrame: Frame | void;

  constructor(cmd_name: string | void, prev_frame: Frame | void) {
    this.cmd = cmd_name;
    this.store = {};
    this.args = [];
    this.values = [];
    this.prevFrame = prev_frame;

    // if (this.prevFrame) {
    //   this.store = {...this.prevFrame.store};
    // }
  }
}
