// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 11.0 **/
odoo.define("terminal.Compat11Common", function(require) {
    "use strict";

    const AbstractTerminal = require("terminal.AbstractTerminal");
    const Bus = require("bus.bus").bus;

    AbstractTerminal.longpolling.include({
        start: function() {
            this._super.apply(this, arguments);
            Bus.on("notification", this, this._onBusNotification);
        },

        addChannel: function(name) {
            return Bus.add_channel(name);
        },

        deleteChannel: function(name) {
            return Bus.delete_channel(name);
        },

        startPoll: function() {
            return Bus.start_polling();
        },

        stopPoll: function() {
            return Bus.stop_polling();
        },
    });
});
