/* global owl */
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 15.0+ **/
odoo.define("terminal.core.compat.16.Backend", function (require) {
    "use strict";

    require("web.legacySetup");
    require("terminal.functions.Backend");
    const {
        SelectCreateDialog,
    } = require("@web/views/view_dialogs/select_create_dialog");
    const Terminal = require("terminal.Terminal");
    const {Component} = owl;

    Terminal.include({
        _openSelectCreateDialog: function (model, title, domain, on_selected) {
            Component.env.services.dialog.add(SelectCreateDialog, {
                resModel: model,
                domain: domain,
                title: title,
                multiSelect: false,
                onSelected: on_selected,
            });
            return Promise.resolve();
        },
    });
});
