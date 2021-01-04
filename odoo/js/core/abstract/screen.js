// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.abstract.Screen", function (require) {
    "use strict";

    const Class = require("web.Class");

    const AbstractScreen = Class.extend({
        init: function (options) {
            this._options = options;
        },

        start: function ($container) {
            this.$container = $container;
        },

        destroy: function () {
            throw Error("Not Implemented!");
        },

        getContent: function () {
            throw Error("Not Implemented!");
        },

        scrollDown: function () {
            throw Error("Not Implemented!");
        },

        clean: function () {
            throw Error("Not Implemented!");
        },

        cleanInput: function () {
            throw Error("Not Implemented!");
        },

        cleanShadowInput: function () {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        updateInput: function (str) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        updateShadowInput: function (str) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        preventLostInputFocus: function (ev) {
            throw Error("Not Implemented!");
        },

        focus: function () {
            throw Error("Not Implemented!");
        },

        getUserInput: function () {
            throw Error("Not Implemented!");
        },

        /* PRINT */
        flush: function () {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        printHTML: function (html) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        print: function (msg, enl, cls) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        eprint: function (msg, enl) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        printCommand: function (cmd, secured = false) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        printError: function (error, internal = false) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        printTable: function (columns, tbody) {
            throw Error("Not Implemented!");
        },
    });

    return AbstractScreen;
});
