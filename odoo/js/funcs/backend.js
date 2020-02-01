// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.BackendFunctions", function(require) {
    "use strict";

    const rpc = require("web.rpc");
    const session = require("web.session");
    const dialogs = require("web.view_dialogs");
    const field_utils = require("web.field_utils");
    const Terminal = require("terminal.Terminal").terminal;

    Terminal.include({
        events: _.extend({}, Terminal.prototype.events, {
            "click .o_terminal_view": "_onClickTerminalView",
        }),

        init: function() {
            this._super.apply(this, arguments);

            this.registerCommand("view", {
                definition: "View model record/s",
                callback: this._viewModelRecord,
                detail:
                    "Open model record in form view or records in list view.",
                syntaxis: "<STRING: MODEL NAME> [INT: RECORD ID]",
                args: "s?i",
            });
            this.registerCommand("metadata", {
                definition: "Show metadata information",
                callback: this._showMetadata,
                detail: "Shows metadata info: xml & record if available",
                syntaxis: "",
                args: "",
            });
            this.registerCommand("settings", {
                definition: "Open settings page",
                callback: this._openSettings,
                detail: "Open settings page.",
                syntaxis: "",
                args: "",
            });
        },

        _openSettings: function() {
            const self = this;
            return this.do_action({
                type: "ir.actions.act_window",
                res_model: "res.config.settings",
                views: [[false, "form"]],
                target: "current",
            }).then(() => {
                self.do_hide();
            });
        },

        _viewModelRecord: function(params) {
            const model = params[0];
            const resId = Number(params[1]) || false;
            const self = this;
            if (resId) {
                return this.do_action({
                    type: "ir.actions.act_window",
                    name: "View Record",
                    res_model: model,
                    res_id: resId,
                    views: [[false, "form"]],
                    target: "new",
                }).then(() => {
                    self.do_hide();
                });
            }
            new dialogs.SelectCreateDialog(this, {
                res_model: model,
                title: "Select a record",
                disable_multiple_selection: true,
                on_selected: records => {
                    self.do_action({
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

        _METADATA_VIEW_TEMPLATE:
            "<strong>ACTIVE VIEW INFO</strong>" +
            "<br><span style='color: gray; padding-left: 1.3em;'>" +
            "XML-ID:</span> <%= id %>" +
            "<br><span style='color: gray; padding-left: 1.3em;'>" +
            "XML-NAME:</span> <%= name %>",

        _METADATA_RECORD_TEMPLATE:
            "<strong>RECORD INFO</strong>" +
            "<br><span style='color: gray; padding-left: 1.3em;'>ID:" +
            "</span> <%= id %>" +
            "<br><span style='color: gray; padding-left: 1.3em;'>" +
            "Creator:</span> <span class='o_terminal_click o_terminal_cmd'" +
            "      data-cmd='view res.users <%= uid %>'><%= creator %></span>" +
            "<br><span style='color: gray; padding-left: 1.3em;'>" +
            "Creation Date: </span> <%= date %>" +
            "<br><span style='color: gray; padding-left: 1.3em;'>" +
            "Last Modification By:</span> " +
            "<span class='o_terminal_click o_terminal_cmd'" +
            "      data-cmd='view res.users <%= wuid %>'><%= user %></span>" +
            "<br><span style='color: gray; padding-left: 1.3em;'>" +
            "Last Modification Date:</span> <%= wdate %>",

        _showMetadata: function() {
            const self = this;
            const view_id = this._get_active_view_type_id();
            if (view_id) {
                return rpc
                    .query({
                        method: "search_read",
                        fields: ["name", "xml_id"],
                        domain: [["id", "=", view_id]],
                        model: "ir.ui.view",
                        limit: 1,
                        kwargs: {context: session.user_context},
                    })
                    .then(results => {
                        const view = results[0];
                        self.print(
                            _.template(self._METADATA_VIEW_TEMPLATE)({
                                id: view.xml_id,
                                name: view.name,
                            })
                        );
                        const controllerSelectedIds = self._get_active_view_selected_ids();
                        if (controllerSelectedIds.length) {
                            self._get_metadata(controllerSelectedIds).then(
                                result => {
                                    const metadata = result[0];
                                    metadata.creator = field_utils.format.many2one(
                                        metadata.create_uid
                                    );
                                    metadata.lastModifiedBy = field_utils.format.many2one(
                                        metadata.write_uid
                                    );
                                    const createDate = field_utils.parse.datetime(
                                        metadata.create_date
                                    );
                                    metadata.create_date = field_utils.format.datetime(
                                        createDate
                                    );
                                    const modificationDate = field_utils.parse.datetime(
                                        metadata.write_date
                                    );
                                    metadata.write_date = field_utils.format.datetime(
                                        modificationDate
                                    );

                                    self.print(
                                        _.template(
                                            self._METADATA_RECORD_TEMPLATE
                                        )({
                                            id: metadata.id,
                                            uid: metadata.create_uid[0],
                                            creator: metadata.creator,
                                            date: metadata.create_date,
                                            user: metadata.lastModifiedBy,
                                            wuid: metadata.write_uid[0],
                                            wdate: metadata.write_date,
                                        })
                                    );
                                }
                            );
                        }
                    });
            }

            return $.Deferred(d => {
                self.print("No metadata available! View ID unknown");
                d.resolve();
            });
        },

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
