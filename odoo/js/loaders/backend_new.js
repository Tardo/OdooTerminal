/* global owl */
// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define("terminal.loaders.Backend", function (require) {
    "use strict";

    const core = require("web.core");
    const legacySession = require("web.session");
    const Terminal = require("terminal.Terminal");
    const rootWidget = require("root.widget");

    const _t = core._t;

    // Ensure load resources
    require("terminal.functions.Core");
    require("terminal.functions.Common");
    require("terminal.functions.Backend");
    require("terminal.functions.Fuzz");

    // Detached initialization to ensure that the terminal loads on all
    // possible conditions. This is necessary because the extension run
    // at 'document idle', and script could be injected after the
    // Odoo 'web client' initialization script.
    (async function boot() {
        // A generic try-catch to avoid stop scripts execution.
        try {
            await owl.utils.whenReady();
            await legacySession.is_bound;
            const terminal = new Terminal(
                rootWidget,
                Terminal.prototype.MODES.BACKEND_NEW
            );
            terminal.env = rootWidget.env;
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
    })();
});
