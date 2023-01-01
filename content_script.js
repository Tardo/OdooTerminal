/* global browser, chrome */
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/**
 * This script is used to start the load process, act as a brigde between
 * 'page script' and 'background script'.
 */
(function () {
    "use strict";

    // Flag to run the script once
    if (window.__OdooTerminal.hasRun) {
        return;
    }
    window.__OdooTerminal.hasRun = true;

    // This is for cross-browser compatibility
    const gBrowserObj = typeof chrome === "undefined" ? browser : chrome;
    // Default collected information
    const gOdooInfoObj = {
        isOdoo: false,
        isLoaded: false,
        serverVersionRaw: null,
        isCompatible: false,
        isFrontend: false,
        serverVersion: {
            major: 12,
            minor: 0,
        },
    };

    /**
     * Helper function to inject an script.
     * @param {String} script - The URL
     * @param {Function} callback - The function to call when scripts loads
     */
    function _injectPageScript(script, callback) {
        const script_page = document.createElement("script");
        const [script_ext] = script.split(".").slice(-1);
        if (script_ext === "mjs") {
            script_page.setAttribute("type", "module");
        } else {
            script_page.setAttribute("type", "text/javascript");
        }
        (document.head || document.documentElement).appendChild(script_page);
        if (callback) {
            script_page.onload = callback;
        }
        script_page.src = gBrowserObj.extension.getURL(script);
    }

    /**
     * Helper function to inject an css.
     * @param {String} css - The URL
     */
    function _injectPageCSS(css) {
        const link_page = document.createElement("link");
        link_page.setAttribute("rel", "stylesheet");
        link_page.setAttribute("type", "text/css");
        (document.head || document.documentElement).appendChild(link_page);
        link_page.href = gBrowserObj.extension.getURL(css);
    }

    /**
     * Helper function to inject multiple file types.
     * @param {Object} files - Files by type to inject
     */
    function _injector(files) {
        let files_len = files.css.length;
        for (let x = 0; x < files_len; ++x) {
            _injectPageCSS(files.css[x]);
        }
        files_len = files.js.length;
        for (let x = 0; x < files_len; ++x) {
            _injectPageScript(files.js[x]);
        }
    }

    /**
     * Send Odoo Info to background.
     */
    function _sendOdooInfoToBackground() {
        gBrowserObj.runtime.sendMessage({
            message: "update_terminal_badge_info",
            odooInfo: gOdooInfoObj,
        });
    }

    /**
     * Update Odoo Info.
     * @param {Object} odoo_info - The collected information
     */
    function _updateOdooInfo(odoo_info) {
        if (typeof odoo_info !== "object") {
            return;
        }
        Object.assign(gOdooInfoObj, odoo_info, {isLoaded: true});
        _sendOdooInfoToBackground();
    }

    /**
     * Get necessary resources to initialize the terminal
     * @param {OdooInfo} info
     * @returns {Array}
     */
    function _getTerminalResources(info) {
        const to_inject = {
            css: [],
            js: ["globals.js"],
        };
        // Compatibility resources
        // 11 - v11
        // 12+ - v12
        // 15+ - v15
        let compat_mode = null;
        const odoo_version = info.serverVersion;
        if (odoo_version.major === 11 && odoo_version.minor === 0) {
            // Version 11.0
            to_inject.js.push("odoo/js/core/compat/v11/common.js");
            compat_mode = 11;
        }
        if (
            (odoo_version.major === 11 && odoo_version.minor > 0) ||
            odoo_version.major >= 12
        ) {
            // Version 12.0
            to_inject.js.push("odoo/js/core/compat/v12/common.js");
            compat_mode = 12;
        }
        if (
            (odoo_version.major === 14 && odoo_version.minor > 0) ||
            odoo_version.major >= 15
        ) {
            // Version 15.0
            to_inject.js.push("odoo/js/core/compat/v15/common.js");
            if (!info.isFrontend) {
                to_inject.js.push("odoo/js/core/compat/v15/backend.js");
            }
            compat_mode = 15;
        }
        if (
            (odoo_version.major === 15 && odoo_version.minor > 0) ||
            odoo_version.major >= 16
        ) {
            // Version 16.0
            to_inject.js.push("odoo/js/core/compat/v16/common.js");
            if (!info.isFrontend) {
                to_inject.js.push("odoo/js/core/compat/v16/backend.js");
            }
            compat_mode = 16;
        }
        // Backend/Frontend resources
        if (info.isFrontend) {
            to_inject.js.push(`odoo/js/loaders/frontend.js`);
        } else {
            let backend_loader = "";
            if (compat_mode >= 15) {
                backend_loader = "_owl_legacy";
            }
            to_inject.js = to_inject.js.concat([
                "odoo/js/core/utils_backend.js",
                "odoo/js/functions/backend.js",
                "odoo/js/functions/fuzz.js",
                `odoo/js/loaders/backend${backend_loader}.js`,
            ]);
        }
        // Common resources
        to_inject.css = to_inject.css.concat(["odoo/css/terminal.css"]);
        to_inject.js = to_inject.js.concat([
            "odoo/js/core/rpc.js",
            "odoo/js/core/utils.js",
            "odoo/js/core/recordset.js",
            "odoo/js/core/abstract/longpolling.js",
            "odoo/js/core/abstract/screen.js",
            "odoo/js/core/storage.js",
            "odoo/js/core/template_manager.js",
            "odoo/js/core/command_assistant.js",
            "odoo/js/core/screen.js",
            "odoo/js/core/longpolling.js",
            "odoo/js/core/trash/external/mparser.js",
            "odoo/js/core/trash/const.js",
            "odoo/js/core/trash/interpreter.js",
            "odoo/js/core/trash/vmachine.js",
            "odoo/js/core/parameter_generator.js",
            "odoo/js/tests/tests.js",
            "odoo/js/tests/test_core.js",
            "odoo/js/tests/test_common.js",
            "odoo/js/tests/test_backend.js",
            "odoo/js/tests/test_trash.js",
            "odoo/js/terminal.js",
            "odoo/js/functions/core.js",
            "odoo/js/functions/common.js",
        ]);
        return to_inject;
    }

    function getStorageSync(key) {
        return new Promise((resolve, reject) => {
            gBrowserObj.storage.sync.get(key, (items) => {
                if (gBrowserObj.runtime?.lastError) {
                    return reject(gBrowserObj.runtime.lastError);
                }
                resolve(items);
            });
        });
    }

    // Listen messages from page script
    window.addEventListener(
        "message",
        (event) => {
            // We only accept messages from ourselves
            if (event.source !== window) {
                return;
            }
            if (
                event.data.odooInfo &&
                !event.data.odooInfo.isLoaded &&
                event.data.type === "ODOO_TERM_INIT"
            ) {
                var info = event.data.odooInfo;
                _updateOdooInfo(info);
                if (info.isCompatible) {
                    _injector(_getTerminalResources(info));
                } else if (info.isOdoo) {
                    console.warn("[OdooTerminal] Incompatible server version!");
                }
            } else if (event.data.type === "ODOO_TERM_START") {
                // Load Init Commands
                getStorageSync(window.__OdooTerminal.SETTING_NAMES).then(
                    (items) => {
                        const data = {};
                        for (const config_name in items) {
                            data[config_name] = items[config_name];
                        }
                        window.postMessage(
                            {
                                type: "ODOO_TERM_CONFIG",
                                config: data,
                            },
                            "*"
                        );
                    }
                );
            }
        },
        false
    );

    // Listen messages from background
    gBrowserObj.runtime.onMessage.addListener((request) => {
        if (request.message === "update_odoo_terminal_info") {
            if (gOdooInfoObj.isLoaded) {
                _sendOdooInfoToBackground();
            } else {
                _injectPageScript("page_script.js", (ev) => {
                    ev.target.parentNode.removeChild(ev.target);
                });
            }
        } else if (request.message === "toggle_terminal") {
            if (gOdooInfoObj.isCompatible) {
                document
                    .getElementById("terminal")
                    .dispatchEvent(new Event("toggle"));
            }
        }
    });
})();
