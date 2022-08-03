// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.Longpolling", function (require) {
    "use strict";

    const AbstractLongPolling = require("terminal.core.abstract.Longpolling");

    const LongPolling = AbstractLongPolling.extend({
        setVerbose: function (status) {
            if (status) {
                this._parent._storage.setItem(
                    "terminal_longpolling_mode",
                    "verbose",
                    (err) => this.screen.printHTML(err)
                );
            } else {
                this._parent._storage.removeItem("terminal_longpolling_mode");
            }
        },

        isVerbose: function () {
            return this._parent._storage.getItem("terminal_longpolling_mode");
        },

        //
        _getNotificationsData: function (data) {
            return data;
        },
        _onBusNotification: function (data) {
            if (this.isVerbose()) {
                this._parent.trigger(
                    "longpolling_notification",
                    this._getNotificationsData(data)
                );
            }
        },
    });

    return LongPolling;
});
