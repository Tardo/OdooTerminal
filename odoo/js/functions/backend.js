// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.functions.Backend", function (require) {
    "use strict";

    const dialogs = require("web.view_dialogs");
    const Terminal = require("terminal.Terminal");

    Terminal.include({
        events: _.extend({}, Terminal.prototype.events, {
            "click .o_terminal_view": "_onClickTerminalView",
        }),

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

        _cmdViewModelRecord: function (kwargs) {
            const context = this._getContext({
                form_view_ref: kwargs.ref || false,
            });
            if (kwargs.id) {
                return this.do_action({
                    type: "ir.actions.act_window",
                    name: "View Record",
                    res_model: kwargs.model,
                    res_id: kwargs.id,
                    views: [[false, "form"]],
                    target: "new",
                    context: context,
                }).then(() => this.doHide());
            }
            new dialogs.SelectCreateDialog(this, {
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
                        target: "new",
                        context: context,
                    });
                },
            }).open();

            return Promise.resolve();
        },

        //
        _onClickTerminalView: function (ev) {
            if (
                Object.prototype.hasOwnProperty.call(
                    ev.target.dataset,
                    "resid"
                ) &&
                Object.prototype.hasOwnProperty.call(ev.target.dataset, "model")
            ) {
                this._cmdViewModelRecord(
                    ev.target.dataset.model,
                    Number(ev.target.dataset.resid)
                );
            }
        },
    });
});
