// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

function cmdChrono(kwargs) {
  return new Promise(async (resolve, reject) => {
    let time_elapsed_secs = -1;
    try {
      const start_time = new Date();
      await this.execute(kwargs.cmd, false);
      time_elapsed_secs = (new Date() - start_time) / 1000.0;
      this.screen.print(`Time elapsed: '${time_elapsed_secs}' seconds`);
    } catch (err) {
      return reject(err);
    }
    return resolve(time_elapsed_secs);
  });
}

export default {
  definition: "Print the time expended executing a command",
  callback: cmdChrono,
  detail:
    "Print the elapsed time in seconds to execute a command. " +
    "<br/>Notice that this time includes the time to format the result!",
  syntax: "<STRING: COMMAND>",
  args: [[ARG.String, ["c", "cmd"], true, "The command to run"]],
  example: "-c 'search res.partner'",
};
