// Copyright 2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define('terminal.AbstractTerminal', function (require) {
    'use strict';

    var core = require('web.core');
    var Widget = require('web.Widget');
    var AbstractTerminalStorage = require('terminal.AbstractTerminalStorage');

    var QWeb = core.qweb;


    return Widget.extend({
        VERSION: '1.0.1',
        PROMPT: '>',

        _registeredCmds: {},
        _inputHistory: [],
        _searchCommandIter: 0,
        _searchCommandQuery: '',
        _searchHistoryIter: 0,

        _active_widget: null,
        _active_action: null,

        _storage: null,


        init: function () {
            QWeb.add_template(`<templates>
                <t t-name='terminal'>
                    <div id='terminal' class='o_terminal'>
                        <div class='col-sm-12 col-lg-12'
                             id='terminal_screen' readonly='readonly'></div>
                        <div class='d-flex terminal-user-input'>
                            <input class='terminal-prompt' readonly='readonly'/>
                            <input type='edit' id='terminal_input'
                                   class='flex-fill' />
                        </div>
                    </div>
                </t>
            </templates>`);

            this._storage = new AbstractTerminalStorage(this);
            this._super.apply(this, arguments);
        },

        _getCommandErrorMessage: function (emsg) {
            return emsg || "undefined error";
        },

        _get_active_view_type_id: function () {
            throw Error("Not Implemented!");
        },

        _get_active_view_selected_ids: function () {
            throw Error("Not Implemented!");
        },

        // eslint-disable-next-line
        _get_metadata: function (ids) {
            throw Error("Not Implemented!");
        },
    });
});
