// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import uniqueId from "@terminal/utils/unique_id";

async function cmdExportVar(kwargs) {
  const varname = uniqueId("term");
  window[varname] = kwargs.value;
  this.screen.print(
    `Command result exported! now you can use '${varname}' variable in the browser console`
  );
  return varname;
}

export default {
  definition: "Exports the command result to a browser console variable",
  callback: cmdExportVar,
  detail: "Exports the command result to a browser console variable.",
  args: [[ARG.Any, ["v", "value"], true, "The value to export"]],
  example: "-v $(search res.partner)",
};
