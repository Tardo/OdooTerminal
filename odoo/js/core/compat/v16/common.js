// Copyright 2021 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 15.0+ **/
odoo.define("terminal.core.compat.16.Common", function (require) {
    "use strict";

    require("terminal.functions.Common");
    const Terminal = require("terminal.Terminal");
    const AbstractLongpolling = require("terminal.core.abstract.Longpolling");

    AbstractLongpolling.include({
        /**
         * @override
         */
        setup: function () {
            this._busServ("onNotification", this._onBusNotification.bind(this));
        },
    });

    Terminal.include({
        /**
         * This is necessary to get working on master
         * Yes, its strange... but server does a [7:] operation.
         *
         * @override
         */
        _sanitizeCmdModuleDepends: function () {
            const name = this._super.apply(this, arguments);
            return `_______${name}`;
        },
    });
});
