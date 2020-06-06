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
    const TemplateManager = require("terminal.TemplateManager");

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
        VERSION: "5.3.0",
        PROMPT: ">",

        _registeredCmds: {},
        _inputHistory: [],
        _searchCommandIter: 0,
        _searchCommandQuery: "",
        _searchHistoryIter: 0,

        _storage: null,
        _longpolling: null,

        _hasExecInitCmds: false,
        _userContext: {active_test: false},

        init: function() {
            this._templates = new TemplateManager();
            QWeb.add_template(this._templates.get("MAIN"));
            this._super.apply(this, arguments);
        },
    });

    return {
        longpolling: AbstractLongPolling,
        storage: AbstractStorage,
        terminal: AbstractTerminal,
    };
});
