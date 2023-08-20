// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import save2file from "@terminal/utils/save2file";
import uniqueId from "@terminal/utils/unique_id";
import {ARG} from "@trash/constants";

async function cmdExportFile(kwargs) {
  const filename = `${uniqueId("term")}_${new Date().getTime()}.json`;
  const data = JSON.stringify(kwargs.value, null, 4);
  save2file(filename, "text/json", data);
  this.screen.print(`Command result exported to '${filename}' file`);
  return filename;
}

export default {
  definition: "Exports the command result to a text/json file",
  callback: cmdExportFile,
  detail: "Exports the command result to a text/json file.",
  args: [[ARG.Any, ["v", "value"], true, "The value to export"]],
  example: "-c 'search res.partner'",
};
