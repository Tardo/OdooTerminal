// Copyright 2021 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 15.0+ **/
odoo.define("terminal.core.compat.15.Common", function (require) {
    "use strict";

    const session = require("web.session");
    const Utils = require("terminal.core.Utils");
    require("terminal.core.compat.12.Common");
    require("terminal.functions.Common");
    const Terminal = require("terminal.Terminal");
    const rpc = require("terminal.core.rpc");

    /**
     * Monkey patch to get correct user id
     */
    const origGetUID = Utils.getUID;
    Utils.getUID = () => {
        let uid = 0;
        try {
            uid = origGetUID();
        } catch (e) {
            // Do nothing
        }

        if (!uid) {
            uid = session.user_id;
        }
        return uid;
    };

    const origGetUsername = Utils.getUsername;
    Utils.getUsername = () => {
        let username = null;
        try {
            username = origGetUsername();
        } catch (e) {
            // Do nothing
        }

        if (!username) {
            username = session.username;
        }
        return username;
    };

    const origGetOdooVersion = Utils.getOdooVersion;
    Utils.getOdooVersion = () => {
        let ver = null;
        try {
            ver = origGetOdooVersion();
        } catch (e) {
            // Do nothing
        }

        if (!ver) {
            ver = session.server_version;
        }
        return ver;
    };

    const origGetOdooVersionInfo = Utils.getOdooVersionInfo;
    Utils.getOdooVersionInfo = () => {
        let ver = null;
        try {
            ver = origGetOdooVersionInfo();
        } catch (e) {
            // Do nothing
        }

        if (!ver) {
            ver = session.server_version_info;
        }
        return ver;
    };

    Terminal.include({
        /**
         * @override
         */
        init: function (parent, mode) {
            this._super.apply(this, arguments);
            if (mode === this.MODES.BACKEND_NEW) {
                this.env = parent.env;
            }
        },

        /**
         * Call to legacy action manager
         * FIXME: Now can't know when the action is completed... :(
         *
         * @override
         */
        do_action: function (action, options) {
            this.env.bus.trigger("do-action", {
                action: action,
                options: options,
            });

            // Simulate action completion time..
            // FIXME: this makes me cry
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({id: action});
                }, 450);
            });
        },

        /** *
         * Common
         ***/

        /**
         * @override
         */
        _cmdContextOperation: function (kwargs) {
            if (
                kwargs.operation === "set" ||
                kwargs.operation === "write" ||
                kwargs.operation === "delete"
            ) {
                return Promise.reject(
                    "This operation is currently not supported in v15.0+"
                );
            }
            this.screen.print(session.user_context);
            return Promise.resolve(session.user_context);
        },

        /**
         * @override
         */
        _cmdRef: function (kwargs) {
            const tasks = [];
            for (const xmlid of kwargs.xmlid) {
                const xmlid_parts = xmlid.split(".");
                const xmlid_module = xmlid_parts.shift();
                tasks.push(
                    rpc
                        .query({
                            method: "check_object_reference",
                            model: "ir.model.data",
                            args: [xmlid_module, xmlid_parts.join(".")],
                            kwargs: {context: this._getContext()},
                        })
                        .then(
                            function (active_xmlid, result) {
                                return [active_xmlid, result[0], result[1]];
                            }.bind(this, xmlid)
                        )
                );
            }

            return Promise.all(tasks).then((results) => {
                let body = "";
                const len = results.length;
                for (let x = 0; x < len; ++x) {
                    const item = results[x];
                    body +=
                        `<tr><td>${item[0]}</td>` +
                        `<td>${item[1]}</td>` +
                        `<td>${item[2]}</td></tr>`;
                }
                this.screen.printTable(
                    ["XML ID", "Res. Model", "Res. ID"],
                    body
                );
                return results;
            });
        },

        //
        _printLongpollingValues: function (notif) {
            this.screen.print([`Type: ${JSON.stringify(notif.type)}`]);
            this.screen.print(notif.payload, false);
        },
    });
});
