// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdChrono(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<number> {
  let time_elapsed_secs = -1;
  const start_time = new Date().getTime();
  await this.execute(kwargs.cmd, false);
  time_elapsed_secs = (new Date().getTime() - start_time) / 1000.0;
  ctx.screen.print(
    i18n.t('cmdChrono.result.timeElapsed', "Time elapsed: '{{time_elapsed_secs}}' seconds", {time_elapsed_secs}),
  );
  return time_elapsed_secs;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdChrono.definition', 'Print the time expended executing a command'),
    callback: cmdChrono,
    detail: i18n.t(
      'cmdChrono.detail',
      'Print the elapsed time in seconds to execute a command. ' +
        '<br/>Notice that this time includes the time to format the result!',
    ),
    args: [[ARG.String, ['c', 'cmd'], true, i18n.t('cmdChrono.args.cmd', 'The command to run')]],
    example: "-c 'search res.partner'",
  };
}
