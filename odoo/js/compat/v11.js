// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


/** Implements 'interfaces' to work with Odoo 11.0 **/
odoo.define('terminal.Compat', function (require) {
    'use strict';

    const local_storage = require('web.local_storage');
    const Terminal = require('terminal.Terminal');


    Terminal.storage.include({
        getItem: function (item) {
            return JSON.parse(local_storage.getItem(item)) || undefined;
        },

        setItem: function (item, value) {
            return local_storage.setItem(item, JSON.stringify(value)) ||
                undefined;
        },

        removeItem: function (item) {
            return local_storage.removeItem(item) || undefined;
        },
    });


    Terminal.terminal.include({
        _getCommandErrorMessage: function (emsg) {
            if (typeof emsg === 'object' &&
                Object.prototype.hasOwnProperty.call(emsg, 'data')) {
                return `${emsg.data.name} (${emsg.data.message})`;
            }
            return this._super.apply(this, arguments);
        },

        _get_active_view_type_id: function () {
            if (this._active_widget.active_view) {
                return this._active_widget.active_view.fields_view.view_id;
            }
            return false;
        },

        _get_active_view_selected_ids: function () {
            if (this._active_widget.active_view) {
                return this._active_widget.active_view.controller
                    .getSelectedIds() || [];
            }
            return [];
        },

        _get_metadata: function (ids) {
            const ds = this._active_widget.dataset;
            return ds.call('get_metadata', [ids]);
        },
    });

});
