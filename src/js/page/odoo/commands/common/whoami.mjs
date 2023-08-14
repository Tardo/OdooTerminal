// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {
  renderWhoami,
  renderWhoamiListItem,
} from "@terminal/core/template_manager";
import rpc from "@odoo/rpc";
import {getUID} from "@odoo/utils";

async function cmdShowWhoAmI() {
  const result = await rpc.query({
    method: "search_read",
    domain: [["id", "=", getUID()]],
    fields: [
      "id",
      "display_name",
      "login",
      "partner_id",
      "company_id",
      "company_ids",
      "groups_id",
    ],
    model: "res.users",
    kwargs: {context: this.getContext()},
  });
  if (!result.length) {
    throw new Error("Oops! can't get the login :/");
  }
  const record = result[0];
  const result_tasks = await Promise.all([
    rpc.query({
      method: "name_get",
      model: "res.groups",
      args: [record.groups_id],
      kwargs: {context: this.getContext()},
    }),
    rpc.query({
      method: "name_get",
      model: "res.company",
      args: [record.company_ids],
      kwargs: {context: this.getContext()},
    }),
  ]);
  let groups_list = "";
  for (const group of result_tasks[0]) {
    groups_list += renderWhoamiListItem({
      name: group[1],
      model: "res.groups",
      id: group[0],
    });
  }
  let companies_list = "";
  for (const company of result_tasks[1]) {
    companies_list += renderWhoamiListItem({
      name: company[1],
      model: "res.company",
      id: company[0],
    });
  }
  const template_values = {
    login: record.login,
    display_name: record.display_name,
    user_id: record.id,
    partner: record.partner_id,
    company: record.company_id,
    companies: companies_list,
    groups: groups_list,
  };
  this.screen.print(renderWhoami(template_values));
  return template_values;
}

export default {
  definition: "Know current user login",
  callback: cmdShowWhoAmI,
  detail: "Shows current user login",
};
