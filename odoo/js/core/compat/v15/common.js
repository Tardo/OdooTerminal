// Copyright 2021 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/** Implementations for Odoo 15.0+ **/
odoo.define("terminal.core.compat.15.Common", function (require) {
    "use strict";

    const Utils = require("terminal.core.Utils");

    /**
     * Monkey patch to get correct user id
     */
    const origGetUID = Utils.getUID;
    Utils.getUID = () => {
        let uid = 0;
        try {
            uid = origGetUID();
        } catch (e) {
            uid = odoo.__DEBUG__.services["@web/session"].session.user_id;
        }
        return uid;
    };
});
