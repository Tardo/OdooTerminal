// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 12.0+ **/
odoo.define("terminal.Compat12Common", function(require) {
    "use strict";

    const AbstractTerminal = require("terminal.AbstractTerminal");

    AbstractTerminal.longpolling.include({
        _busServ: function(method, ...params) {
            return this._parent.call("bus_service", method, ...params);
        },

        init: function() {
            this._super.apply(this, arguments);
            this._busServ("onNotification", this, this._onBusNotification);
        },

        addChannel: function(name) {
            return this._busServ("addChannel", name);
        },

        deleteChannel: function(name) {
            return this._busServ("deleteChannel", name);
        },

        startPoll: function() {
            return this._busServ("startPolling");
        },

        stopPoll: function() {
            return this._busServ("stopPolling");
        },
    });
});
