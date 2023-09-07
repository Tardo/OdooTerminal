// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from '@trash/constants';

async function cmdRepeat(kwargs, screen) {
  if (kwargs.times < 0) {
    throw new Error("'Times' parameter must be positive");
  }
  const res = [];
  const do_repeat = rtimes => {
    if (!rtimes) {
      screen.print(
        `<i>** Repeat finsihed: '${kwargs.cmd}' called ${kwargs.times} times</i>`,
      );
      return res;
    }
    this.eval(`$repeat_index=${kwargs.times - rtimes}`, {silent: true});
    return this.eval(kwargs.cmd, {silent: kwargs.silent})
      .then(result => res.push(result))
      .finally(() => do_repeat(rtimes - 1));
  };
  return do_repeat(kwargs.times);
}

export default {
  definition: 'Repeat a command N times',
  callback: cmdRepeat,
  detail:
    "Repeat a command N times.\nCan use '$repeat_index' to get the iterator index.",
  args: [
    [ARG.Number, ['t', 'times'], true, 'Times to run'],
    [ARG.String, ['c', 'cmd'], true, 'The command to run'],
    [
      ARG.Flag,
      ['silent', 'silent'],
      false,
      "Used to don't print command output",
    ],
  ],
  example:
    '-t 20 -c "create res.partner {name: \'Example Partner #\' + $repeat_index}"',
};
