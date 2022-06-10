/* global owl */
// Copyright 2022 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 15.0+ **/
odoo.define("terminal.core.compat.15.Backend", function (require) {
    "use strict";

    require("web.legacySetup");
    require("terminal.functions.Backend");
    const Terminal = require("terminal.Terminal");
    const {standaloneAdapter} = require("web.OwlCompatibility");

    const {Component} = owl;

    Terminal.include({
        /**
         * Replace the parent by and adapter
         * @override
         */
        _getDialogParent: function () {
            if (owl.__info__.version.split(".")[0] === "2") {
                return standaloneAdapter({Component});
            }
            return this;
        },
    });
});
