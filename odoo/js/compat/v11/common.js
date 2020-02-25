// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 11.0 **/
odoo.define("terminal.Compat11Common", function(require) {
    "use strict";

    const Terminal = require("terminal.Terminal");
    // FIXME: Only available in backend
    const Bus = require("bus.bus").bus;

    Terminal.terminal.include({
        start: function() {
            this._super.apply(this, arguments);
            // Listen long-polling (Used by 'longpolling' command)
            Bus.on("notification", this, this._onBusNotification);
        },
    });
});
