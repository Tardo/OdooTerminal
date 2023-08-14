// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {doAction} from "@odoo/root";

async function cmdOpenSettings(kwargs) {
  await doAction({
    name: "Settings",
    type: "ir.actions.act_window",
    res_model: "res.config.settings",
    view_mode: "form",
    views: [[false, "form"]],
    target: "inline",
    context: {module: kwargs.module},
  });
  this.doHide();
}

export default {
  definition: "Open settings page",
  callback: cmdOpenSettings,
  detail: "Open settings page.",
  args: [
    [
      ARG.String,
      ["m", "module"],
      false,
      "The module technical name",
      "general_settings",
    ],
  ],
  example: "-m sale_management",
};
