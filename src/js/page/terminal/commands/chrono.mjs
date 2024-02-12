// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import i18n from 'i18next';
import {ARG} from '@trash/constants';

async function cmdChrono(kwargs, screen) {
  let time_elapsed_secs = -1;
  const start_time = new Date();
  await this.execute(kwargs.cmd, false);
  time_elapsed_secs = (new Date() - start_time) / 1000.0;
  screen.print(
    i18n.t(
      'cmdChronoTimeElapsed',
      "Time elapsed: '{{time_elapsed_secs}}' seconds",
      {time_elapsed_secs},
    ),
  );
  return time_elapsed_secs;
}

export default {
  definition: 'Print the time expended executing a command',
  callback: cmdChrono,
  detail:
    'Print the elapsed time in seconds to execute a command. ' +
    '<br/>Notice that this time includes the time to format the result!',
  syntax: '<STRING: COMMAND>',
  args: [[ARG.String, ['c', 'cmd'], true, 'The command to run']],
  example: "-c 'search res.partner'",
};
