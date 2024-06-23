// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import type {ArgDef, ParseInfo} from './interpreter';
import type {default as VMachine, EvalOptions} from './vmachine';
import type Frame from './frame';

export default class FunctionTrash {
  args: $ReadOnlyArray<ArgDef>;
  code: ParseInfo;

  constructor(args: $ReadOnlyArray<ArgDef>, code: ParseInfo) {
    this.args = args;
    this.code = code;
  }

  toString(): string {
    return `[FunctionTrash]`;
  }

  async exec(vmachine: VMachine, kwargs: {[string]: mixed}, frame: Frame, opts: EvalOptions): Promise<mixed> {
    frame.store = {...kwargs};
    return await vmachine.execute(this.code, opts, frame);
  }
}
