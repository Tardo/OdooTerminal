// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from "../rpc.mjs";
import {ARG} from "../../terminal/trash/constants.mjs";
import {default as OdooRoot, doAction, showEffect} from "../root.mjs";
import {getContent, getOdooService, getOdooVersionMajor} from "../utils.mjs";
import {file2Base64, isEmpty} from "../../terminal/core/utils.mjs";

function getDialogParent() {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    const {Component} = owl;
    const {standaloneAdapter} = getOdooService("web.OwlCompatibility");
    if (owl.__info__.version.split(".")[0] === "2") {
      return standaloneAdapter({Component});
    }
  }
  return OdooRoot;
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
  return Promise.resolve();
}

function cmdViewModelRecord(kwargs) {
  const context = this.getContext({
    form_view_ref: kwargs.ref || false,
  });
  if (kwargs.id) {
    return doAction({
      type: "ir.actions.act_window",
      name: "View Record",
      res_model: kwargs.model,
      res_id: kwargs.id,
      views: [[false, "form"]],
      target: "current",
      context: context,
    }).then(() => {
      this.doHide();
    });
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

function cmdOpenSettings(kwargs) {
  return doAction({
    name: "Settings",
    type: "ir.actions.act_window",
    res_model: "res.config.settings",
    view_mode: "form",
    views: [[false, "form"]],
    target: "inline",
    context: {module: kwargs.module},
  }).then(() => this.doHide());
}

function cmdLang(kwargs) {
  return new Promise(async (resolve, reject) => {
    try {
      const filtered_kwargs = Object.fromEntries(
        Object.entries(kwargs).filter(
          ([key]) => key !== "operation" || key !== "format"
        )
      );
      const is_empty_args = isEmpty(filtered_kwargs);
      if (kwargs.operation === "export") {
        if (is_empty_args) {
          return resolve(doAction("base.action_wizard_lang_export"));
        }
        if (!kwargs.lang || !kwargs.format || isEmpty(kwargs.module)) {
          return reject(
            "'export' operation needs the following arguments: --lang, --format, --module"
          );
        }
        // Get module ids
        let module_ids = await rpc.query({
          method: "search_read",
          domain: [["name", "in", kwargs.module]],
          fields: ["id"],
          model: "ir.module.module",
          kwargs: {context: this.getContext()},
        });
        module_ids = module_ids.map((item) => item.id);
        if (isEmpty(module_ids)) {
          return reject("No modules found!");
        }
        // Create wizard record
        const wizard_id = await rpc.query({
          method: "create",
          model: "base.language.export",
          args: [
            {
              state: "choose",
              format: kwargs.format,
              lang: kwargs.lang,
              modules: [[6, false, module_ids]],
            },
          ],
          kwargs: {context: this.getContext()},
        });
        if (!wizard_id) {
          return reject("Can't create wizard record!");
        }

        // Get action to export
        await rpc.query({
          method: "act_getfile",
          model: "base.language.export",
          args: [[wizard_id]],
          kwargs: {context: this.getContext()},
        });

        // Get updated wizard record data
        const wizard_record = await rpc.query({
          method: "search_read",
          domain: [["id", "=", wizard_id]],
          fields: false,
          model: "base.language.export",
          kwargs: {context: this.getContext()},
        });

        // Get file
        const content_def = getContent(
          {
            model: "base.language.export",
            id: wizard_id,
            field: "data",
            filename_field: "name",
            filename: wizard_record.name || "",
          },
          this.printError
        );

        return resolve(content_def);
      } else if (kwargs.operation === "import") {
        if (is_empty_args) {
          return resolve(doAction("base.action_view_base_import_language"));
        }
        if (
          !kwargs.name ||
          !kwargs.lang ||
          !kwargs.format ||
          isEmpty(kwargs.module)
        ) {
          return reject(
            "'import' operation needs the following arguments: --name, --lang, --format, --module"
          );
        }
        // Get file content
        const file64 = await file2Base64();

        // Create wizard record
        const wizard_id = await rpc.query({
          method: "create",
          model: "base.language.import",
          args: [
            {
              name: kwargs.name,
              code: kwargs.lang,
              filename: `${kwargs.lang}.${kwargs.format}`,
              overwrite: !kwargs.no_overwrite,
              data: file64,
            },
          ],
          kwargs: {context: this.getContext()},
        });
        if (!wizard_id) {
          return reject("Can't create wizard record!");
        }

        // Get action to export
        const status = await rpc.query({
          method: "import_lang",
          model: "base.language.import",
          args: [[wizard_id]],
          kwargs: {context: this.getContext()},
        });
        if (status) {
          this.screen.print("Language file imported successfully");
        }
        return resolve(status);
      } else if (kwargs.operation === "list") {
        const langs = await rpc.query({
          method: "get_installed",
          model: "res.lang",
          kwargs: {context: this.getContext()},
        });
        for (const lang of langs) {
          this.screen.print(` - ${lang[0]} (${lang[1]})`);
        }
        return resolve(langs);
      }
      return reject("Invalid operation!");
    } catch (err) {
      return reject(err);
    }
  });
}

function cmdCallAction(kwargs) {
  return doAction(kwargs.action, kwargs.options);
}

function cmdShowEffect(kwargs) {
  if (getOdooVersionMajor() < 15) {
    return Promise.reject("This command is only available in Odoo 15.0+");
  }
  if (isEmpty(kwargs.type)) {
    const registry = getOdooService("@web/core/registry").registry;
    const effects = registry.category("effects");
    this.screen.print("Available effects:");
    this.screen.print(effects.getEntries().map((item) => item[0]));
  } else {
    showEffect(kwargs.type, kwargs.options);
    return Promise.resolve();
  }
}

export function registerBackendFuncs(TerminalObj) {
  TerminalObj.registerCommand("view", {
    definition: "View model record/s",
    callback: cmdViewModelRecord,
    detail: "Open model record in form view or records in list view.",
    args: [
      [ARG.String, ["m", "model"], true, "The model technical name"],
      [ARG.Number, ["i", "id"], false, "The record id"],
      [ARG.String, ["r", "ref"], false, "The view reference name"],
    ],
    example: "-m res.partner -i 10 -r base.view_partner_simple_form",
  });
  TerminalObj.registerCommand("settings", {
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
  });
  TerminalObj.registerCommand("lang", {
    definition: "Operations over translations",
    callback: cmdLang,
    detail: "Operations over translations.",
    args: [
      [
        ARG.String,
        ["o", "operation"],
        true,
        "The operation",
        "export",
        ["export", "import", "list"],
      ],
      [
        ARG.String,
        ["l", "lang"],
        false,
        "The language<br/>Can use '__new__' for new language (empty translation template)",
      ],
      [
        ARG.List | ARG.String,
        ["m", "module"],
        false,
        "The technical module name",
      ],
      [
        ARG.String,
        ["f", "format"],
        false,
        "The format to use",
        "po",
        ["po", "csv"],
      ],
      [ARG.String, ["n", "name"], false, "The language name"],
      [
        ARG.Flag,
        ["no", "no-overwrite"],
        false,
        "Flag to indicate dont overwrite current translations",
      ],
    ],
    example: "-o export -l en_US -m mail",
  });
  TerminalObj.registerCommand("action", {
    definition: "Call action",
    callback: cmdCallAction,
    detail: "Call action",
    args: [
      [
        ARG.Any,
        ["a", "action"],
        true,
        "The action to launch<br/>Can be an string, number or object",
      ],
      [ARG.Dictionary, ["o", "options"], false, "The extra options to use"],
    ],
    example: "-a 134",
  });
  TerminalObj.registerCommand("effect", {
    definition: "Show effect",
    callback: cmdShowEffect,
    detail: "Show effect",
    args: [
      [ARG.String, ["t", "type"], false, "The type of the effect"],
      [ARG.Dictionary, ["o", "options"], false, "The extra options to use"],
    ],
    example: "-t rainbow_man -o {message: 'Hello world!'}",
  });
}
