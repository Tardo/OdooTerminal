// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 15.0+ **/
odoo.define("terminal.core.compat.16.Common", function (require) {
    "use strict";

    require("terminal.core.compat.15.Common");
    const Terminal = require("terminal.Terminal");
    const Utils = require("terminal.core.Utils");
    const AbstractLongpolling = require("terminal.core.abstract.Longpolling");
    const Longpolling = require("terminal.core.Longpolling");

    AbstractLongpolling.include({
        /**
         * @override
         */
        _busServ: function (method, ...params) {
            const bus_serv = this._parent.env.services.bus_service;
            if (!bus_serv) {
                throw new Error("bus service not loaded");
            }
            return bus_serv[method](...params);
        },

        /**
         * @override
         */
        setup: function () {
            this._busServ(
                "addEventListener",
                "notification",
                this._onBusNotification.bind(this)
            );
        },

        stopPoll: function () {
            return this._busServ("stop");
        },

        startPoll: function () {
            return this._busServ("forceUpdateChannels");
        },
    });

    Longpolling.include({
        /**
         * @override
         */
        _getNotificationsData: function (data) {
            return data.detail;
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

        /**
         * @override
         */
        _getBarcodeService: function () {
            return Utils.getOdooService("@barcodes/barcode_service");
        },
        /**
         * @override
         */
        _getBarcodeEvent: function (data) {
            return new KeyboardEvent("keydown", {
                key: data,
            });
        },
        /**
         * @override
         */
        _getBarcodeInfo: function (barcodeService) {
            return [
                `Max. time between keys (ms): ${barcodeService.barcodeService.maxTimeBetweenKeysInMs}`,
                "Reserved barcode prefixes: O-BTN., O-CMD.",
                `Available commands: ${this._AVAILABLE_BARCODE_COMMANDS.join(
                    ", "
                )}`,
            ];
        },
    });
});
