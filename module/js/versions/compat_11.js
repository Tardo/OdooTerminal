// Copyright 2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.AbstractTerminal11', function (require) {
    'use strict';

    var AbstractTerminal = require('terminal.AbstractTerminal');


    AbstractTerminal.include({
        _getCommandErrorMessage: function (emsg) {
            if (typeof emsg === 'object' &&
                Object.prototype.hasOwnProperty.call(emsg, 'data')) {
                return emsg.data.name;
            }
            return this._super.apply(this, arguments);
        },

        _get_active_view_type_id: function () {
            return this._active_widget.active_view.fields_view.view_id;
        },

        _get_active_view_selected_ids: function () {
            return this._active_widget.active_view.controller
                .getSelectedIds() || [];
        },

        _get_metadata: function (ids) {
            const ds = this._active_widget.dataset;
            return ds.call('get_metadata', [ids]);
        },
    });

});
