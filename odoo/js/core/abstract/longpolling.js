// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.abstract.Longpolling", function (require) {
    "use strict";

    const Class = require("web.Class");

    const AbstractLongPolling = Class.extend({
        _parent: null,

        /**
         * @param {Widget} parent - Odoo Widget
         * @param {Boolean} verbose
         */
        init: function (parent) {
            this._parent = parent;
        },

        /**
         * @param {Array} notifications
         */
        // eslint-disable-next-line
        _onBusNotification: function (notifications) {
            throw Error("Not Implemented!");
        },

        /**
         * @param {Boolean} status
         */
        // eslint-disable-next-line
        setVerbose: function (status) {
            throw Error("Not Implemented!");
        },

        /**
         * @returns {Boolean}
         */
        // eslint-disable-next-line
        isVerbose: function () {
            throw Error("Not Implemented!");
        },

        /**
         * @param {String} name
         */
        // eslint-disable-next-line
        addChannel: function (name) {
            throw Error("Not Implemented!");
        },

        /**
         * @param {String} name
         */
        // eslint-disable-next-line
        deleteChannel: function (name) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        startPoll: function () {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        stopPoll: function () {
            throw Error("Not Implemented!");
        },
    });

    return AbstractLongPolling;
});
