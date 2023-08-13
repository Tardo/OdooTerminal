// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";

function cmdJSTest(kwargs) {
  let mod = kwargs.module || "";
  if (kwargs.module === "*") {
    mod = "";
  }
  let url = "/web/tests";
  if (kwargs.device === "mobile") {
    url += "/mobile";
  }
  url += `?module=${mod}`;
  window.location = url;
  return Promise.resolve();
}

export default {
  definition: "Launch JS Tests",
  callback: cmdJSTest,
  detail: "Runs js tests in desktop or mobile mode for the selected module.",
  args: [
    [ARG.String, ["m", "module"], false, "The module technical name"],
    [
      ARG.String,
      ["d", "device"],
      false,
      "The device to test",
      "desktop",
      ["desktop", "mobile"],
    ],
  ],
  example: "-m web -d mobile",
};
