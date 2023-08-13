// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {isEmpty} from "@terminal/core/utils";

function cmdAlias(kwargs) {
  const aliases = this.storageLocal.getItem("terminal_aliases") || {};
  if (!kwargs.name) {
    if (isEmpty(aliases)) {
      this.screen.print("No aliases defined.");
    } else {
      for (const alias_name in aliases) {
        this.screen.printHTML(
          ` - ${alias_name}  <small class="text-muted"><i>${aliases[alias_name]}</i></small>`
        );
      }
    }
    return Promise.resolve(aliases);
  } else if (Object.hasOwn(this.registeredCmds, kwargs.name)) {
    return Promise.reject("Invalid alias name");
  }
  if (kwargs.cmd && kwargs.cmd.length) {
    aliases[kwargs.name] = kwargs.cmd;
    this.screen.print("Alias created successfully");
  } else if (Object.hasOwn(aliases, kwargs.name)) {
    delete aliases[kwargs.name];
    this.screen.print("Alias removed successfully");
  } else {
    return Promise.reject("The selected alias not exists");
  }
  this.storageLocal.setItem("terminal_aliases", aliases, (err) =>
    this.screen.printHTML(err)
  );
  return Promise.resolve(aliases);
}

export default {
  definition: "Create aliases",
  callback: cmdAlias,
  detail:
    "Define aliases to run commands easy. " +
    "<br><b>WARNING:</b> This command uses 'local storage' " +
    "to persist the data even if you close the browser. " +
    "This data can be easy accessed by other computer users. " +
    "Don't use sensible data if you are using a shared " +
    "computer." +
    "<br><br>Can use positional parameters ($1,$2,$3,$N...)",
  args: [
    [ARG.String, ["n", "name"], false, "The name of the alias"],
    [ARG.String, ["c", "cmd"], false, "The command to run"],
  ],
  example: "-n myalias -c \"print 'Hello, $1!'\"",
};
