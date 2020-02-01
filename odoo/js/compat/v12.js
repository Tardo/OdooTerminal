// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


/** Implementations for Odoo 12.0+ **/
odoo.define('terminal.Compat12', function (require) {
    'use strict';

    const rpc = require('web.rpc');
    const Terminal = require('terminal.Terminal');


    Terminal.terminal.include({
        start: function () {
            this._super.apply(this, arguments);
            // Listen long-polling (Used by 'longpolling' command)
            this.call(
                'bus_service', 'onNotification', this, this._onBusNotification);
        },

        _getCommandErrorMessage: function (emsg) {
            if (typeof emsg === 'object' &&
                Object.prototype.hasOwnProperty.call(emsg, 'message')) {
                if (typeof emsg.message === 'string') {
                    return emsg.message;
                }
                const msgInfo = emsg.message.data;
                return `${msgInfo.name} (${msgInfo.message})`;
            }
            return this._super.apply(this, arguments);
        },

        _get_active_view_type_id: function () {
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
