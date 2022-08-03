// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.functions.Backend", function (require) {
    "use strict";

    const dialogs = require("web.view_dialogs");
    const rpc = require("terminal.core.rpc");
    const Terminal = require("terminal.Terminal");
    const Utils = require("terminal.core.Utils");
    require("terminal.core.UtilsBackend");

    function OdooEvent(target, name, data) {
        this.target = target;
        this.name = name;
        this.data = Object.create(null);
        _.extend(this.data, data);
        this.stopped = false;
    }

    OdooEvent.prototype.stopPropagation = function () {
        this.stopped = true;
    };

    OdooEvent.prototype.is_stopped = function () {
        return this.stopped;
    };

    Terminal.include({
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand("view", {
                definition: "View model record/s",
                callback: this._cmdViewModelRecord,
                detail: "Open model record in form view or records in list view.",
                args: [
                    "s::m:model::1::The model technical name",
                    "i::i:id::0::The record id",
                    "s::r:ref::0::The view reference name",
                ],
                example:
                    "-m res.partner -i 10 -r base.view_partner_simple_form",
            });
            this.registerCommand("settings", {
                definition: "Open settings page",
                callback: this._cmdOpenSettings,
                detail: "Open settings page.",
                args: [
                    "s::m:module::0::The module technical name::general_settings",
                ],
                example: "-m sale_management",
            });
            this.registerCommand("lang", {
                definition: "Operations over translations",
                callback: this._cmdLang,
                detail: "Operations over translations.",
                args: [
                    "s::o:operation::1::The operation::::export:import:list",
                    "s::l:lang::0::The language<br/>Can use '__new__' for new language (empty translation template)",
                    "ls::m:module::0::The technical module name",
                    "s::f:format::0::The format to use::po::po:csv",
                    "s::n:name::0::The language name",
                    "f::no-overwrite:no-overwrite::0::Flag to indicate dont overwrite current translations",
                ],
                example: "-o export -l en_US -m mail",
            });
            this.registerCommand("action", {
                definition: "Call action",
                callback: this._cmdCallAction,
                detail: "Call action",
                args: [
                    "-::a:action::1::The action to launch<br/>Can be an string, number or object",
                    "j::o:options::0::The extra options to use",
                ],
                example: "-a 134",
            });
        },

        _cmdCallAction: function (kwargs) {
            return this.do_action(kwargs.action, kwargs.options);
        },

        _cmdLang: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                try {
                    const is_empty_args = _.chain(kwargs)
                        .omit(["operation", "format"])
                        .isEmpty()
                        .value();
                    if (kwargs.operation === "export") {
                        if (is_empty_args) {
                            return resolve(
                                this.do_action("base.action_wizard_lang_export")
                            );
                        }
                        if (
                            !kwargs.lang ||
                            !kwargs.format ||
                            _.isEmpty(kwargs.module)
                        ) {
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
                            kwargs: {context: this._getContext()},
                        });
                        module_ids = _.map(module_ids, "id");
                        if (_.isEmpty(module_ids)) {
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
                            kwargs: {context: this._getContext()},
                        });
                        if (!wizard_id) {
                            return reject("Can't create wizard record!");
                        }

                        // Get action to export
                        await rpc.query({
                            method: "act_getfile",
                            model: "base.language.export",
                            args: [[wizard_id]],
                            kwargs: {context: this._getContext()},
                        });

                        // Get updated wizard record data
                        const wizard_record = await rpc.query({
                            method: "search_read",
                            domain: [["id", "=", wizard_id]],
                            fields: false,
                            model: "base.language.export",
                            kwargs: {context: this._getContext()},
                        });

                        // Get file
                        const content_def = Utils.getContent(
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
                            return resolve(
                                this.do_action(
                                    "base.action_view_base_import_language"
                                )
                            );
                        }
                        if (
                            !kwargs.name ||
                            !kwargs.lang ||
                            !kwargs.format ||
                            _.isEmpty(kwargs.module)
                        ) {
                            return reject(
                                "'import' operation needs the following arguments: --name, --lang, --format, --module"
                            );
                        }
                        // Get file content
                        const file64 = await Utils.file2Base64();

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
                            kwargs: {context: this._getContext()},
                        });
                        if (!wizard_id) {
                            return reject("Can't create wizard record!");
                        }

                        // Get action to export
                        const status = await rpc.query({
                            method: "import_lang",
                            model: "base.language.import",
                            args: [[wizard_id]],
                            kwargs: {context: this._getContext()},
                        });
                        if (status) {
                            this.screen.print(
                                "Language file imported successfully"
                            );
                        }
                        return resolve(status);
                    } else if (kwargs.operation === "list") {
                        const langs = await rpc.query({
                            method: "get_installed",
                            model: "res.lang",
                            kwargs: {context: this._getContext()},
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
        },

        _cmdOpenSettings: function (kwargs) {
            return this.do_action({
                name: "Settings",
                type: "ir.actions.act_window",
                res_model: "res.config.settings",
                view_mode: "form",
                views: [[false, "form"]],
                target: "inline",
                context: {module: kwargs.module},
            }).then(() => this.doHide());
        },

        _getDialogParent: function () {
            return this;
        },
        _cmdViewModelRecord: function (kwargs) {
            const context = this._getContext({
                form_view_ref: kwargs.ref || false,
            });
            return new Promise((resolve) => {
                if (kwargs.id) {
                    return this.do_action({
                        type: "ir.actions.act_window",
                        name: "View Record",
                        res_model: kwargs.model,
                        res_id: kwargs.id,
                        views: [[false, "form"]],
                        target: "current",
                        context: context,
                    }).then(() => {
                        this.doHide();
                        resolve();
                    });
                }
                const dialog = new dialogs.SelectCreateDialog(
                    this._getDialogParent(),
                    {
                        res_model: kwargs.model,
                        title: "Select a record",
                        disable_multiple_selection: true,
                        on_selected: (records) => {
                            this.do_action({
                                type: "ir.actions.act_window",
                                name: "View Record",
                                res_model: kwargs.model,
                                res_id: records[0].id,
                                views: [[false, "form"]],
                                target: "current",
                                context: context,
                            });
                        },
                    }
                );
                dialog.open();
                return dialog.opened().then(resolve);
            });
        },
    });
});
