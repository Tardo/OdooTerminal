// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.loaders.Backend", function(require) {
    "use strict";

    const core = require("web.core");
    const Terminal = require("terminal.Terminal");
    const WebClientObj = require("web.web_client");

    // Ensure load resources
    require("terminal.functions.Core");
    require("terminal.functions.Common");
    require("terminal.functions.Backend");
    require("terminal.functions.Fuzz");

    // Detached initialization to ensure that the terminal loads on all
    // possible conditions. This is necessary because the extension run
    // at 'document idle', and script could be injected after the
    // Odoo 'web client' initialization script.
    $(() => {
        // A generic try-catch to avoid stop scripts execution.
        try {
            const terminal = new Terminal(WebClientObj);
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
            console.warn("[OdooTerminal] Can't initialize the terminal!");
        }
    });
});
