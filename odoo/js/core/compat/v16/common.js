// Copyright 2021 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 15.0+ **/
odoo.define("terminal.core.compat.16.Common", function (require) {
    "use strict";

    require("terminal.core.compat.15.Common");
    const Terminal = require("terminal.Terminal");
    const Utils = require("terminal.core.Utils");
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

        /**
         * @override
         */
        _getBarcodeService: function () {
            return Utils.getOdooService("@barcodes/barcode_service");
        },
        /**
         * @override
         */
        _cmdBarcode: function (kwargs) {
            // Soft-dependency... this don't exists if barcodes module is not installed
            const BarcodeService = this._getBarcodeService();
            if (!BarcodeService) {
                return Promise.reject(
                    "The 'barcode' module is not installed/available"
                );
            }
            return new Promise(async (resolve, reject) => {
                if (kwargs.operation === "info") {
                    const info = [
                        `Max. time between keys (ms): ${BarcodeService.barcodeService.maxTimeBetweenKeysInMs}`,
                        "Reserved barcode prefixes: O-BTN., O-CMD.",
                        `Available commands: ${this._AVAILABLE_BARCODE_COMMANDS.join(
                            ", "
                        )}`,
                    ];

                    this.screen.eprint(info);
                    return resolve(info);
                } else if (kwargs.operation === "send") {
                    if (!kwargs.data) {
                        return reject("No data given!");
                    }

                    for (const barcode of kwargs.data) {
                        for (
                            let i = 0, bardoce_len = barcode.length;
                            i < bardoce_len;
                            ++i
                        ) {
                            document.body.dispatchEvent(
                                new KeyboardEvent("keydown", {
                                    key: barcode[i],
                                })
                            );
                            await Utils.asyncSleep(kwargs.pressdelay);
                        }
                        await Utils.asyncSleep(kwargs.barcodedelay);
                    }
                } else {
                    return reject("Invalid operation!");
                }
                return resolve();
            });
        },
    });
});
