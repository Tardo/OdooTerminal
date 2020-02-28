// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/**
 * This file is 'only' for better readability of the source.
 * Here are 'declared' the methods that are not compatible on all Odoo versions
 * or classes that can be implemented in various ways...
 * For exmaple, Storage can be implemented to use localStorage instead of
 * sessionStorage.
 */
odoo.define("terminal.AbstractTerminal", function(require) {
    "use strict";

    const core = require("web.core");
    const Widget = require("web.Widget");
    const Class = require("web.Class");

    const QWeb = core.qweb;

    const AbstractStorage = Class.extend({
        _parent: null,

        /**
         * @param {Widget} parent - Odoo Widget
         */
        init: function(parent) {
            this._parent = parent;
        },

        /**
         * @param {String} item
         */
        // eslint-disable-next-line
        getItem: function(item) {
            throw Error("Not Implemented!");
        },

        /**
         * @param {String} item
         * @param {Object} value
         */
        // eslint-disable-next-line
        setItem: function(item, value) {
            throw Error("Not Implemented!");
        },

        /**
         * @params {String} item
         */
        // eslint-disable-next-line
        removeItem: function(item) {
            throw Error("Not Implemented!");
        },
    });

    const AbstractLongPolling = Class.extend({
        _parent: null,

        /**
         * @param {Widget} parent - Odoo Widget
         * @param {Boolean} verbose
         */
        init: function(parent) {
            this._parent = parent;
        },

        /**
         * @param {Array} notifications
         */
        // eslint-disable-next-line
        _onBusNotification: function(notifications) {
            throw Error("Not Implemented!");
        },

        /**
         * @param {Boolean} status
         */
        // eslint-disable-next-line
        setVerbose: function(status) {
            throw Error("Not Implemented!");
        },

        /**
         * @returns {Boolean}
         */
        // eslint-disable-next-line
        isVerbose: function() {
            throw Error("Not Implemented!");
        },

        /**
         * @param {String} name
         */
        // eslint-disable-next-line
        addChannel: function(name) {
            throw Error("Not Implemented!");
        },

        /**
         * @param {String} name
         */
        // eslint-disable-next-line
        deleteChannel: function(name) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        startPoll: function() {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        stopPoll: function() {
            throw Error("Not Implemented!");
        },
    });

    const AbstractTerminal = Widget.extend({
        VERSION: "5.0.0",
        PROMPT: ">",

        _registeredCmds: {},
        _inputHistory: [],
        _searchCommandIter: 0,
        _searchCommandQuery: "",
        _searchHistoryIter: 0,

        _active_widget: null,
        _active_action: null,

        _storage: null,
        _longpolling: null,

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
    });

    return {
        longpolling: AbstractLongPolling,
        storage: AbstractStorage,
        terminal: AbstractTerminal,
    };
});
