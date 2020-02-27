// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.BackendFunctions", function(require) {
    "use strict";

    const dialogs = require("web.view_dialogs");
    const Terminal = require("terminal.Terminal").terminal;

    Terminal.include({
        events: _.extend({}, Terminal.prototype.events, {
            "click .o_terminal_view": "_onClickTerminalView",
        }),

        init: function() {
            this._super.apply(this, arguments);

            this.registerCommand("view", {
                definition: "View model record/s",
                callback: this._cmdViewModelRecord,
                detail:
                    "Open model record in form view or records in list view.",
                syntaxis: "<STRING: MODEL NAME> [INT: RECORD ID]",
                args: "s?i",
            });
            this.registerCommand("settings", {
                definition: "Open settings page",
                callback: this._cmdOpenSettings,
                detail: "Open settings page.",
                syntaxis: "",
                args: "",
            });
        },

        _cmdOpenSettings: function() {
            return this.do_action({
                type: "ir.actions.act_window",
                res_model: "res.config.settings",
                views: [[false, "form"]],
                target: "current",
            }).then(() => {
                this.do_hide();
            });
        },

        _cmdViewModelRecord: function(params) {
            const model = params[0];
            const resId = Number(params[1]) || false;
            if (resId) {
                return this.do_action({
                    type: "ir.actions.act_window",
                    name: "View Record",
                    res_model: model,
                    res_id: resId,
                    views: [[false, "form"]],
                    target: "new",
                }).then(() => {
                    this.do_hide();
                });
            }
            new dialogs.SelectCreateDialog(this, {
                res_model: model,
                title: "Select a record",
                disable_multiple_selection: true,
                on_selected: records => {
                    this.do_action({
                        type: "ir.actions.act_window",
                        name: "View Record",
                        res_model: model,
                        res_id: records[0].id,
                        views: [[false, "form"]],
                        target: "new",
                    });
                },
            }).open();

            return $.Deferred(d => {
                d.resolve();
            });
        },

        //
        _onClickTerminalView: function(ev) {
            if (
                Object.prototype.hasOwnProperty.call(
                    ev.target.dataset,
                    "resid"
                ) &&
                Object.prototype.hasOwnProperty.call(ev.target.dataset, "model")
            ) {
                this._viewModelRecord([
                    ev.target.dataset.model,
                    ev.target.dataset.resid,
                ]);
            }
        },
    });
});
