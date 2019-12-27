// Copyright 2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define('terminal.AbstractTerminalStorage', function (require) {
    'use strict';

    var Class = require('web.Class');

    return Class.extend({
        // eslint-disable-next-line
        getItem: function (item) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        setItem: function (item, value) {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        removeItem: function (item) {
            throw Error("Not Implemented!");
        },
    });
});
