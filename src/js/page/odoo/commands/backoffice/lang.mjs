// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {doAction} from "@odoo/root";
import rpc from "@odoo/rpc";
import getContent from "@odoo/utils/get_content";
import file2base64 from "@terminal/utils/file2base64";
import isEmpty from "@terminal/utils/is_empty";
import {ARG} from "@trash/constants";

async function cmdLang(kwargs) {
  const filtered_kwargs = Object.fromEntries(
    Object.entries(kwargs).filter(
      ([key]) => key !== "operation" || key !== "format"
    )
  );
  const is_empty_args = isEmpty(filtered_kwargs);
  if (kwargs.operation === "export") {
    if (is_empty_args) {
      return doAction("base.action_wizard_lang_export");
    }
    if (!kwargs.lang || !kwargs.format || isEmpty(kwargs.module)) {
      throw new Error(
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
      throw new Error("No modules found!");
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
      throw new Error("Can't create wizard record!");
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

    return content_def;
  } else if (kwargs.operation === "import") {
    if (is_empty_args) {
      return doAction("base.action_view_base_import_language");
    }
    if (
      !kwargs.name ||
      !kwargs.lang ||
      !kwargs.format ||
      isEmpty(kwargs.module)
    ) {
      throw new Error(
        "'import' operation needs the following arguments: --name, --lang, --format, --module"
      );
    }
    // Get file content
    const file64 = await file2base64();

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
      throw new Error("Can't create wizard record!");
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
    return status;
  } else if (kwargs.operation === "list") {
    const langs = await rpc.query({
      method: "get_installed",
      model: "res.lang",
      kwargs: {context: this.getContext()},
    });
    for (const lang of langs) {
      this.screen.print(` - ${lang[0]} (${lang[1]})`);
    }
    return langs;
  }
  throw new Error("Invalid operation!");
}

export default {
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
};
