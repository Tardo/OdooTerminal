// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";

function cmdCount(kwargs) {
  return rpc
    .query({
      method: "search_count",
      model: kwargs.model,
      args: [kwargs.domain],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.print(`Result: ${result}`);
      return result;
    });
}

export default {
  definition:
    "Gets number of records from the given model in the selected domain",
  callback: cmdCount,
  detail: "Gets number of records from the given model in the selected domain",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [ARG.List | ARG.Any, ["d", "domain"], false, "The domain", []],
  ],
  example: "res.partner ['name', '=ilike', 'A%']",
};
