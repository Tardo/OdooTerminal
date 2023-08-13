// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import Recordset from "@terminal/core/recordset";
import rpc from "@odoo/rpc";

function cmdSearchModelRecordId(kwargs) {
  const fields = kwargs.field[0] === "*" ? false : kwargs.field;
  return rpc
    .query({
      method: "search_read",
      domain: [["id", "in", kwargs.id]],
      fields: fields,
      model: kwargs.model,
      kwargs: {context: this.getContext()},
    })
    .then((result) => {
      this.screen.printRecords(kwargs.model, result);
      return Recordset.make(kwargs.model, result);
    });
}

export default {
  definition: "Search model record",
  callback: cmdSearchModelRecordId,
  detail: "Launch orm search query.",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [ARG.List | ARG.Number, ["i", "id"], true, "The record id's"],
    [
      ARG.List | ARG.String,
      ["f", "field"],
      false,
      "The fields to request<br/>Can use '*' to show all fields",
      ["display_name"],
    ],
  ],
  example: "-m res.partner -i 10,4,2 -f name,street",
};
