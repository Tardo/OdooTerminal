// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.Utils", function () {
    "use strict";

    // See https://en.wikipedia.org/wiki/List_of_Unicode_characters
    const encodeHTML = (text) =>
        text?.replace(
            /[\u00A0-\u9999\u003C-\u003E\u0022-\u002F]/gim,
            (i) => `&#${i.charCodeAt(0)};`
        );

    // See https://stackoverflow.com/a/7616484
    const genHash = (text) => {
        let hash = 0;
        const len = text.length;
        for (let i = 0; i < len; ++i) {
            hash = (hash << 5) - hash + text.charCodeAt(i);
            // Convert to 32bit integer
            hash |= 0;
        }
        return hash;
    };

    const hex2rgb = (hex) => {
        const r = (hex >> 24) & 0xff;
        const g = (hex >> 16) & 0xff;
        const b = (hex >> 8) & 0xff;
        return [r, g, b];
    };

    // See https://stackoverflow.com/a/48855846
    const unescapeSlashes = (text) => {
        let parsed_text = text.replace(/(^|[^\\])(\\\\)*\\$/, "$&\\");
        parsed_text = parsed_text.replace(/(^|[^\\])((\\\\)*")/g, "$1\\$2");
        try {
            parsed_text = JSON.parse(`"${parsed_text}"`);
        } catch (e) {
            return text;
        }
        return parsed_text;
    };

    const save2File = (filename, type, data) => {
        const blob = new Blob([data], {type: type});
        const elem = window.document.createElement("a");
        const objURL = window.URL.createObjectURL(blob);
        elem.href = objURL;
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
        URL.revokeObjectURL(objURL);
    };

    const file2Base64 = () => {
        const input_elm = window.document.createElement("input");
        input_elm.type = "file";
        document.body.appendChild(input_elm);
        const onBodyFocus = (reject) => {
            if (!input_elm.value.length) {
                return reject("Aborted by user. No file given...");
            }
        };

        return new Promise((resolve, reject) => {
            window.addEventListener("focus", onBodyFocus.bind(this, reject));
            input_elm.onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.readAsDataURL(file);

                reader.onerror = reject;
                reader.onabort = reject;
                reader.onload = (readerEvent) =>
                    resolve(readerEvent.target.result);
            };
            input_elm.click();
        }).finally(() => {
            window.removeEventListener("focus", onBodyFocus);
            document.body.removeChild(input_elm);
        });
    };

    const getUID = () => {
        return (
            odoo.session_info?.uid ||
            odoo.session_info?.user_id ||
            odoo.__DEBUG__.services["@web/session"]?.session.user_id ||
            -1
        );
    };

    const getUsername = () => {
        return odoo.session_info?.username;
    };

    const getOdooVersion = () => {
        return (
            odoo.session_info?.server_version ||
            odoo.__DEBUG__.services["@web/session"]?.session.server_version
        );
    };

    const getOdooVersionInfo = () => {
        return (
            odoo.session_info?.server_version_info ||
            odoo.__DEBUG__.services["@web/session"]?.session.server_version_info
        );
    };

    const isPublicUser = () => {
        return (
            odoo.session_info?.is_website_user ||
            odoo.__DEBUG__.services["@web/session"]?.session.is_website_user
        );
    };

    const asyncSleep = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    const genColorFromString = (str) => {
        const [r, g, b] = hex2rgb(genHash(str));
        const gv =
            1 - (0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255));
        return {
            rgb: [r, g, b],
            gv: gv,
        };
    };

    const rgb2hsv = (r, g, b) => {
        const h_min = Math.min(Math.min(r, g), b);
        const h_max = Math.max(Math.max(r, g), b);

        // Hue
        let hue = 0.0;

        if (h_max === h_min) {
            hue = 0.0;
        } else if (h_max === r) {
            hue = (g - b) / (h_max - h_min);
        } else if (h_max === g) {
            hue = 2.0 + (b - r) / (h_max - h_min);
        } else {
            hue = 4.0 + (r - g) / (h_max - h_min);
        }

        hue /= 6.0;

        if (hue < 0.0) {
            hue += 1.0;
        }

        // Saturation
        let s = 0.0;
        if (h_max !== 0.0) {
            s = (h_max - h_min) / h_max;
        }

        // Value
        const v = h_max;

        return [hue, s, v];
    };

    const hsv2rgb = (x, y, z) => {
        const h = Number(x * 6.0).toFixed();
        const f = x * 6.0 - h;
        const p = z * (1.0 - y);
        const q = z * (1.0 - y * f);
        const t = z * (1.0 - y * (1.0 - f));

        let rgb = [0.0, 0.0, 0.0];
        const _h = h % 6;
        if (_h === 0) {
            rgb = [z, t, p];
        } else if (_h === 1) {
            rgb = [q, z, p];
        } else if (_h === 2) {
            rgb = [q, z, t];
        } else if (_h === 3) {
            rgb = [p, q, z];
        } else if (_h === 4) {
            rgb = [t, p, z];
        } else if (_h === 5) {
            rgb = [z, p, q];
        }
        return rgb;
    };

    return {
        encodeHTML: encodeHTML,
        genHash: genHash,
        hex2rgb: hex2rgb,
        unescapeSlashes: unescapeSlashes,
        save2File: save2File,
        getUID: getUID,
        getUsername: getUsername,
        getOdooVersion: getOdooVersion,
        getOdooVersionInfo: getOdooVersionInfo,
        isPublicUser: isPublicUser,
        file2Base64: file2Base64,
        asyncSleep: asyncSleep,
        genColorFromString: genColorFromString,
        rgb2hsv: rgb2hsv,
        hsv2rgb: hsv2rgb,
    };
});
