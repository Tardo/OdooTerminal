// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import Recordset from "@terminal/core/recordset";
import {renderRecordCreated} from "@terminal/core/template_manager";
import rpc from "@odoo/rpc";
import {doAction} from "@odoo/root";

function cmdCreateModelRecord(kwargs) {
  if (typeof kwargs.value === "undefined") {
    return doAction({
      type: "ir.actions.act_window",
      res_model: kwargs.model,
      views: [[false, "form"]],
      target: "current",
    }).then(() => {
      this.doHide();
    });
  }
  return new Promise(async (resolve, reject) => {
    try {
      const result = await rpc.query({
        method: "create",
        model: kwargs.model,
        args: [kwargs.value],
        kwargs: {context: this.getContext()},
      });
      this.screen.print(
        renderRecordCreated({
          model: kwargs.model,
          new_id: result,
        })
      );
      return resolve(
        Recordset.make(kwargs.model, [
          Object.assign({}, kwargs.value, {id: result}),
        ])
      );
    } catch (err) {
      return reject(err);
    }
  });
}

export default {
  definition: "Create new record",
  callback: cmdCreateModelRecord,
  detail: "Open new model record in form view or directly.",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [ARG.Dictionary, ["v", "value"], false, "The values to write"],
  ],
  example: "-m res.partner -v {name: 'Poldoore'}",
};
