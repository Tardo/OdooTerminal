// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {getStorageItem, setStorageItem} from "@terminal/core/storage/local";
import isEmpty from "@terminal/utils/is_empty";

async function cmdAlias(kwargs) {
  const aliases = getStorageItem("terminal_aliases") || {};
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
    return aliases;
  } else if (Object.hasOwn(this.registeredCmds, kwargs.name)) {
    throw new Error("Invalid alias name");
  }
  if (kwargs.cmd && kwargs.cmd.length) {
    aliases[kwargs.name] = kwargs.cmd;
    this.screen.print("Alias created successfully");
  } else if (Object.hasOwn(aliases, kwargs.name)) {
    delete aliases[kwargs.name];
    this.screen.print("Alias removed successfully");
  } else {
    throw new Error("The selected alias not exists");
  }
  setStorageItem("terminal_aliases", aliases, (err) =>
    this.screen.printHTML(err)
  );
  return aliases;
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
