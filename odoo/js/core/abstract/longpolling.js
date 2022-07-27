// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.abstract.Longpolling", function (require) {
    "use strict";

    const Class = require("web.Class");
    const core = require("web.core");

    const _t = core._t;

    const AbstractLongPolling = Class.extend({
        _parent: null,

        /**
         * @param {Widget} parent - Odoo Widget
         * @param {Boolean} verbose
         */
        init: function (parent) {
            this._parent = parent;
            this.setup();
        },

        setup: function () {
            throw Error(_t("Not Implemented!"));
        },

        /**
         * @param {Array} notifications
         */
        // eslint-disable-next-line
        _onBusNotification: function (notifications) {
            throw Error(_t("Not Implemented!"));
        },

        /**
         * @param {Boolean} status
         */
        // eslint-disable-next-line
        setVerbose: function (status) {
            throw Error(_t("Not Implemented!"));
        },

        /**
         * @returns {Boolean}
         */
        // eslint-disable-next-line
        isVerbose: function () {
            throw Error(_t("Not Implemented!"));
        },

        /**
         * @param {String} name
         */
        // eslint-disable-next-line
        addChannel: function (name) {
            throw Error(_t("Not Implemented!"));
        },

        /**
         * @param {String} name
         */
        // eslint-disable-next-line
        deleteChannel: function (name) {
            throw Error(_t("Not Implemented!"));
        },

        // eslint-disable-next-line
        startPoll: function () {
            throw Error(_t("Not Implemented!"));
        },

        // eslint-disable-next-line
        stopPoll: function () {
            throw Error(_t("Not Implemented!"));
        },
    });

    return AbstractLongPolling;
});
