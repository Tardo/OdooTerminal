// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


odoo.define('terminal.FrontendLoader', function (require) {
    'use strict';

    const core = require('web.core');
    const Terminal = require('terminal.Terminal').terminal;

    // Ensure load resources
    require('terminal.Compat');
    require('terminal.CoreFunctions');
    require('terminal.CommonFunctions');


    $(() => {
        const terminal = new Terminal(null, $('body').data());
        terminal.setElement($('body').find('#terminal'));
        terminal.start();

        core.bus.on('toggle_terminal', this, () => {
            terminal.do_toggle();
        });
        // This is used to communicate to the extension that the widget
        // is initialized successfully.
        window.postMessage({
            type: "ODOO_TERM_START",
        }, "*");
    });

});
