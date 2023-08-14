// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {isEmpty} from "@terminal/core/utils";
import rpc from "@odoo/rpc";

async function cmdCheckFieldAccess(kwargs) {
  const fields = kwargs.field[0] === "*" ? false : kwargs.field;
  const result = await rpc.query({
    method: "fields_get",
    model: kwargs.model,
    args: [fields],
    kwargs: {context: this.getContext()},
  });

  let s_result = null;
  const keys = Object.keys(result);
  if (isEmpty(kwargs.filter)) {
    s_result = result;
  } else {
    s_result = [];
    const fkeys = Object.keys(kwargs.filter);
    for (const fkey of fkeys) {
      for (const key of keys) {
        if (
          Object.hasOwn(result[key], fkey) &&
          result[key][fkey] === kwargs.filter[fkey]
        ) {
          s_result[key] = result[key];
        }
      }
    }
  }
  const s_keys = Object.keys(s_result).sort();
  const fieldParams = [
    "type",
    "string",
    "relation",
    "required",
    "readonly",
    "searchable",
    "translate",
    "depends",
  ];
  let body = "";
  const len = s_keys.length;
  for (let x = 0; x < len; ++x) {
    const field = s_keys[x];
    const fieldDef = s_result[field];
    body += "<tr>";
    if (fieldDef.required) {
      body += `<td>* <b style='color:mediumslateblue'>${field}</b></td>`;
    } else {
      body += `<td>${field}</td>`;
    }
    const l2 = fieldParams.length;
    for (let x2 = 0; x2 < l2; ++x2) {
      let value = fieldDef[fieldParams[x2]];
      if (typeof value === "undefined" || value === null) {
        value = "";
      }
      body += `<td>${value}</td>`;
    }
    body += "</tr>";
  }
  fieldParams.unshift("field");
  this.screen.printTable(fieldParams, body);
  return s_result;
}

export default {
  definition: "Check model fields access",
  callback: cmdCheckFieldAccess,
  detail: "Show readable/writeable fields of the selected model",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [
      ARG.List | ARG.String,
      ["f", "field"],
      false,
      "The field names to request",
      ["*"],
    ],
    [ARG.Dictionary, ["fi", "filter"], false, "The filter to apply"],
  ],
  example: "-m res.partner -f name,street",
};
