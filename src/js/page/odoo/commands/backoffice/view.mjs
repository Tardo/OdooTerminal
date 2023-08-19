// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ARG} from "@trash/constants";
import {default as OdooRoot, doAction} from "@odoo/root";
import getOdooService from "@odoo/utils/get_odoo_service";
import getOdooVersionMajor from "@odoo/utils/get_odoo_version_major";

function getDialogParent() {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    const {Component} = owl;
    const {standaloneAdapter} = getOdooService("web.OwlCompatibility");
    if (owl.__info__.version.split(".")[0] === "2") {
      return standaloneAdapter({Component});
    }
  }
  return OdooRoot();
}
function openSelectCreateDialog(model, title, domain, on_selected) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer < 16) {
    const dialogs = getOdooService("web.view_dialogs");
    const dialog = new dialogs.SelectCreateDialog(getDialogParent(), {
      res_model: model,
      title: title,
      domain: domain || "[]",
      disable_multiple_selection: true,
      on_selected: on_selected,
    });
    dialog.open();
    return dialog.opened();
  }

  const {Component} = owl;
  const {SelectCreateDialog} = getOdooService(
    "@web/views/view_dialogs/select_create_dialog"
  );
  Component.env.services.dialog.add(SelectCreateDialog, {
    resModel: model,
    domain: domain,
    title: title,
    multiSelect: false,
    onSelected: on_selected,
  });
}

async function cmdViewModelRecord(kwargs) {
  const context = this.getContext({
    form_view_ref: kwargs.ref || false,
  });
  if (kwargs.id) {
    await doAction({
      type: "ir.actions.act_window",
      name: "View Record",
      res_model: kwargs.model,
      res_id: kwargs.id,
      views: [[false, "form"]],
      target: "current",
      context: context,
    });
    this.doHide();
    return;
  }
  return openSelectCreateDialog(
    kwargs.model,
    "Select a record",
    [],
    (records) => {
      doAction({
        type: "ir.actions.act_window",
        name: "View Record",
        res_model: kwargs.model,
        res_id: records[0].id || records[0],
        views: [[false, "form"]],
        target: "current",
        context: context,
      });
    }
  );
}

export default {
  definition: "View model record/s",
  callback: cmdViewModelRecord,
  detail: "Open model record in form view or records in list view.",
  args: [
    [ARG.String, ["m", "model"], true, "The model technical name"],
    [ARG.Number, ["i", "id"], false, "The record id"],
    [ARG.String, ["r", "ref"], false, "The view reference name"],
  ],
  example: "-m res.partner -i 10 -r base.view_partner_simple_form",
};
