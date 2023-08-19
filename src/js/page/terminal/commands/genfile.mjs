// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import file2file from "@terminal/utils/file2file";

async function cmdGenFile(kwargs) {
  return file2file(kwargs.name, kwargs.options);
}

export default {
  definition: "Generate a File object",
  callback: cmdGenFile,
  detail:
    "Open a browser file dialog and instanciates a File object with the content of the selected file",
  args: [
    [ARG.String, ["n", "name"], false, "The File object file name"],
    [ARG.Dictionary, ["o", "options"], false, "The File object options"],
  ],
  example: "-n unnecessaryName.png",
};
