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

    // See https://stackoverflow.com/a/7616484
    const genHash = text => {
        let hash = 0;
        const len = text.length;
        for (let i = 0; i < len; ++i) {
            hash = (hash << 5) - hash + text.charCodeAt(i);
            // Convert to 32bit integer
            hash |= 0;
        }
        return hash;
    };

    const hex2rgb = hex => {
        const r = (hex >> 24) & 0xff;
        const g = (hex >> 16) & 0xff;
        const b = (hex >> 8) & 0xff;
        return [r, g, b];
    };

    // See https://stackoverflow.com/a/48855846
    const unescapeSlashes = text => {
        let parsed_text = text.replace(/(^|[^\\])(\\\\)*\\$/, "$&\\");
        try {
            parsed_text = JSON.parse(`"${parsed_text}"`);
        } catch (e) {
            return text;
        }
        return parsed_text;
    };

    const save2File = (filename, type, data) => {
        const blob = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename);
        } else {
            const elem = window.document.createElement("a");
            const objURL = window.URL.createObjectURL(blob);
            elem.href = objURL;
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
            URL.revokeObjectURL(objURL);
        }
    };

    return {
        encodeHTML: encodeHTML,
        genHash: genHash,
        hex2rgb: hex2rgb,
        unescapeSlashes: unescapeSlashes,
        save2File: save2File,
    };
});
