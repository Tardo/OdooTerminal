// Copyright 2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


odoo.define('terminal.AbstractTerminal13', function (require) {
    'use strict';

    const rpc = require('web.rpc');
    const AbstractTerminal = require('terminal.AbstractTerminal');


    AbstractTerminal.storage.include({
        _parent: null,

        init: function (parent) {
            this._parent = parent;
        },

        getItem: function (item) {
            return this._parent.call('session_storage', 'getItem', item);
        },

        setItem: function (item, value) {
            return this._parent.call('session_storage', 'setItem', item, value);
        },

        removeItem: function (item) {
            return this._parent.call('session_storage', 'removeItem', item);
        },
    });

    AbstractTerminal.terminal.include({
        _getCommandErrorMessage: function (emsg) {
            if (typeof emsg === 'object' &&
                Object.prototype.hasOwnProperty.call(emsg, 'message')) {
                if (typeof emsg.message === 'string') {
                    return emsg.message;
                }
                return emsg.message.data.name;
            }
            return this._super.apply(this, arguments);
        },

        _get_active_view_type_id: function () {
            if (this._active_action.view_id) {
                return this._active_action.view_id[0];
            }
            for (const index in this._active_action._views) {
                if (this._active_action._views[index][1] ===
                        this._active_widget.viewType) {
                    return this._active_action._views[index][0];
                }
            }
            return false;
        },

        _get_active_view_selected_ids: function () {
            return this._active_widget.getSelectedIds() || [];
        },

        _get_metadata: function (ids) {
            return rpc.query({
                model: this._active_widget.modelName,
                method: 'get_metadata',
                args: ids,
            });
        },

    });

});
