// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.Utils", function() {
    "use strict";

    // See https://en.wikipedia.org/wiki/List_of_Unicode_characters
    const encodeHTML = text =>
        text.replace(
            /[\u00A0-\u9999\u003C-\u003E\u0022-\u002F]/gim,
            i => `&#${i.charCodeAt(0)};`
        );

    return {
        encodeHTML: encodeHTML,
    };
});
