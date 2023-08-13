// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";

function cmdCallModelMethod(kwargs) {
  const pkwargs = kwargs.kwarg;
  if (typeof pkwargs.context === "undefined") {
    pkwargs.context = this.getContext();
  }
  return rpc
    .query({
      method: kwargs.call,
      model: kwargs.model,
      args: kwargs.argument,
      kwargs: pkwargs,
    })
    .then((result) => {
      this.screen.eprint(result, false, "line-pre");
      return result;
    });
}

export default {
  definition: "Call model method",
  callback: cmdCallModelMethod,
  detail:
    "Call model method. Remember: Methods with @api.model decorator doesn't need the id.",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [ARG.String, ["c", "call"], true, "The method name to call"],
    [ARG.List | ARG.Any, ["a", "argument"], false, "The arguments list", []],
    [ARG.Dictionary, ["k", "kwarg"], false, "The arguments dictionary", {}],
  ],
  example: "-m res.partner -c address_get -a [8]",
};
