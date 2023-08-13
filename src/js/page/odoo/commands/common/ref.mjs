// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import rpc from "@odoo/rpc";
import {getOdooVersionMajor} from "@odoo/utils";

function cmdRef(kwargs) {
  const OdooVer = getOdooVersionMajor();
  const tasks = [];
  for (const xmlid of kwargs.xmlid) {
    if (OdooVer < 15) {
      tasks.push(
        rpc
          .query({
            method: "xmlid_to_res_model_res_id",
            model: "ir.model.data",
            args: [xmlid],
            kwargs: {context: this.getContext()},
          })
          .then(
            function (active_xmlid, result) {
              return [active_xmlid, result[0], result[1]];
            }.bind(this, xmlid)
          )
      );
    } else {
      const xmlid_parts = xmlid.split(".");
      const module = xmlid_parts[0];
      const xid = xmlid_parts.slice(1).join(".");
      tasks.push(
        rpc
          .query({
            method: "check_object_reference",
            model: "ir.model.data",
            args: [module, xid],
            kwargs: {context: this.getContext()},
          })
          .then(
            function (active_xmlid, result) {
              return [active_xmlid, result[0], result[1]];
            }.bind(this, xmlid)
          )
      );
    }
  }

  return Promise.all(tasks).then((results) => {
    let body = "";
    const len = results.length;
    for (let x = 0; x < len; ++x) {
      const item = results[x];
      body +=
        `<tr><td>${item[0]}</td>` +
        `<td>${item[1]}</td>` +
        `<td>${item[2]}</td></tr>`;
    }
    this.screen.printTable(["XML ID", "Res. Model", "Res. ID"], body);
    return results;
  });
}

export default {
  definition: "Show the referenced model and id of the given xmlid's",
  callback: cmdRef,
  detail: "Show the referenced model and id of the given xmlid's",
  args: [[ARG.List | ARG.String, ["x", "xmlid"], true, "The XML-ID"]],
  example: "-x base.main_company,base.model_res_partner",
};
