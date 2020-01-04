// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


odoo.define('terminal.BackendLoader', function (require) {
    'use strict';

    const WebClient = require('web.WebClient');
    const core = require('web.core');
    const Terminal = require('terminal.Terminal').terminal;


    WebClient.include({
        terminal: null,

        show_application: function () {
            window.odooTerminal = this.terminal = new Terminal(this);
            this.terminal.setElement(this.$el.parents().find('#terminal'));
            this.terminal.start();

            core.bus.on('toggle_terminal', this, () => {
                this.terminal.do_toggle();
            });
            // This is used to communicate to the extension that the widget
            // is initialized successfully.
            window.postMessage({
                type: "ODOO_TERM_START",
            }, "*");
            return this._super.apply(this, arguments);
        },

        current_action_updated: function (action, controller) {
            this._super.apply(this, arguments);
            if (this.terminal) {
                if (controller && controller.widget) {
                    this.terminal.setActiveWidget(
                        controller && controller.widget);
                } else if (action) {
                    this.terminal.setActiveWidget(action.widget);
                } else {
                    this.terminal.setActiveWidget(null);
                }
                this.terminal.setActiveAction(action);
            }
        },
    });

});
