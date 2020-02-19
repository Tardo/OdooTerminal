// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 12.0+ **/
odoo.define("terminal.Compat12Common", function(require) {
    "use strict";

    const Terminal = require("terminal.Terminal");

    Terminal.terminal.include({
        start: function() {
            this._super.apply(this, arguments);
            // Listen long-polling (Used by 'longpolling' command)
            this.call(
                "bus_service",
                "onNotification",
                this,
                this._onBusNotification
            );
        },
    });
});
