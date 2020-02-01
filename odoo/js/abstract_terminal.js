// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.AbstractTerminal", function(require) {
    "use strict";

    const core = require("web.core");
    const Widget = require("web.Widget");
    const Class = require("web.Class");

    const QWeb = core.qweb;

    const AbstractStorage = Class.extend({
        _parent: null,

        init: function(parent) {
            this._parent = parent;
        },

        // eslint-disable-next-line
        getItem: function(item) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        setItem: function(item, value) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        removeItem: function(item) {
            throw Error("Not Implemented!");
        },
    });

    const AbstractTerminal = Widget.extend({
        VERSION: "2.4.0",
        PROMPT: ">",

        _registeredCmds: {},
        _inputHistory: [],
        _searchCommandIter: 0,
        _searchCommandQuery: "",
        _searchHistoryIter: 0,

        _active_widget: null,
        _active_action: null,

        _storage: null,

        _has_exec_init_cmds: false,

        init: function() {
            QWeb.add_template(`<templates>
                <t t-name='terminal'>
                    <div id='terminal' class='o_terminal'>
                        <div class='col-sm-12 col-lg-12 col-12'
                             id='terminal_screen' tabindex="-1" />
                        <div class='d-flex terminal-user-input'>
                            <input class='terminal-prompt' readonly='readonly'/>
                            <div class="flex-fill rich-input">
                                <input type='edit' id='terminal_shadow_input'
                                       readonly='readonly'/>
                                <input type='edit' id='terminal_input' />
                            </div>
                        </div>
                        <div class="terminal-screen-info-zone">
                            <span class='terminal-screen-running-cmds'
                                  id='terminal_running_cmd_count' />
                            <div
                                class='btn btn-sm terminal-screen-icon-maximize'
                                role='button'>
                                <i class='fa fa-window-maximize'></i>
                            </div>
                        </div>
                    </div>
                </t>
            </templates>`);

            this._super.apply(this, arguments);
        },

        /**
         * Sanitize the Odoo error message.
         * @param {Object} emsg - Odoo error
         * @returns {String}
         */
        _getCommandErrorMessage: function(emsg) {
            return emsg || "undefined error";
        },

        _get_active_view_type_id: function() {
            throw Error("Not Implemented!");
        },

        _get_active_view_selected_ids: function() {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        _get_metadata: function(ids) {
            throw Error("Not Implemented!");
        },
    });

    return {
        storage: AbstractStorage,
        terminal: AbstractTerminal,
    };
});
