// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {doAction} from "@odoo/root";
import {ARG} from "@trash/constants";

async function cmdCallAction(kwargs) {
  return doAction(kwargs.action, kwargs.options);
}

export default {
  definition: "Call action",
  callback: cmdCallAction,
  detail: "Call action",
  args: [
    [
      ARG.Any,
      ["a", "action"],
      true,
      "The action to launch<br/>Can be an string, number or object",
    ],
    [ARG.Dictionary, ["o", "options"], false, "The extra options to use"],
  ],
  example: "-a 134",
};
