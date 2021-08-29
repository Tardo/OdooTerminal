// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.UtilsBackend", function (require) {
    "use strict";

    const Utils = require("terminal.core.Utils");
    const odoo_utils = require("web.utils");
    const session = require("web.session");
    const framework = require("web.framework");

    Utils.getContent = (options, onerror) => {
        return session.get_file({
            complete: framework.unblockUI,
            data: _.extend({}, options, {
                download: true,
                data: odoo_utils.is_bin_size(options.data)
                    ? null
                    : options.data,
            }),
            error: onerror,
            url: "/web/content",
        });
    };
});
