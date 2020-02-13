// Copyright 2019-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 13.0+ **/
odoo.define("terminal.Compat13", function(require) {
    "use strict";

    const Terminal = require("terminal.Terminal");
    require("terminal.Compat12");

    Terminal.terminal.include({
        _get_active_view_type_id: function() {
            if (this._active_action.view_id) {
                return this._active_action.view_id[0];
            }
            return this._super.apply(this, arguments);
        },
    });
});
