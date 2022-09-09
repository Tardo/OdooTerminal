// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.loaders.Frontend", function (require) {
    "use strict";

    require("web.dom_ready");
    const core = require("web.core");
    const Utils = require("terminal.core.Utils");
    const Terminal = require("terminal.Terminal");

    const _t = core._t;

    // Ensure load resources
    require("terminal.functions.Core");
    require("terminal.functions.Common");

    const session_info = {};

    Terminal.include({
        start: function () {
            const sup_prom = this._super.apply(this, arguments);
            return new Promise(async (resolve, reject) => {
                await sup_prom;
                const uid = Utils.getUID();
                try {
                    const server_version = await this.execute(
                        "rpc -o \"{'route': '/jsonrpc', 'method': 'server_version', 'params': {'service': 'db'}}\"",
                        false,
                        true
                    );
                    session_info.server_version = server_version;
                    session_info.is_public_user = Utils.isPublicUser();
                    if (Utils.getUID() === -1) {
                        session_info.uid = -1;
                        session_info.username = "Unregistered User";
                    } else {
                        session_info.uid = uid;
                        try {
                            const whoami = await this.execute(
                                "whoami",
                                false,
                                true
                            );
                            session_info.username = whoami.login;
                        } catch (err) {
                            session_info.uid = -1;
                            session_info.username = "Unknown User";
                        }
                    }
                    this.screen.updateInputInfo(
                        session_info.username,
                        session_info.server_version
                    );
                } catch (err) {
                    return reject(err);
                }
                return resolve();
            });
        },
    });

    const origGetUsername = Utils.getUsername;
    Utils.getUsername = () => {
        let username = null;
        try {
            username = origGetUsername();
        } catch (e) {
            // Do nothing
        }

        if (!username) {
            username = session_info.username;
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
            ver = session_info.server_version;
        }
        return ver;
    };

    $(() => {
        // A generic try-catch to avoid stop scripts execution.
        try {
            const terminal = new Terminal(
                null,
                Terminal.prototype.MODES.FRONTEND
            );

            core.bus.on("toggle_terminal", this, () => {
                terminal.doToggle();
            });
            // This is used to communicate to the extension that the widget
            // is initialized successfully.
            window.postMessage(
                {
                    type: "ODOO_TERM_START",
                },
                "*"
            );
        } catch (e) {
            console.error(e);
            console.warn(_t("[OdooTerminal] Can't initialize the terminal!"));
        }
    });
});
