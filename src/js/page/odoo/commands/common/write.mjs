// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";

async function cmdWriteModelRecord(kwargs) {
  if (kwargs.value.constructor !== Object) {
    throw new Error("Invalid values!");
  }
  return rpc
    .query({
      method: "write",
      model: kwargs.model,
      args: [kwargs.id, kwargs.value],
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.print(`${kwargs.model} record updated successfully`);
      return result;
    });
}

export default {
  definition: "Update record values",
  callback: cmdWriteModelRecord,
  detail: "Update record values.",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [ARG.List | ARG.Number, ["i", "id"], true, "The record id's"],
    [ARG.Dictionary, ["v", "value"], true, "The values to write"],
  ],
  example: "-m res.partner -i 10,4,2 -v {street: 'Diagon Alley'}",
};
