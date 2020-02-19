/* global browser, chrome */
// Copyright 2019-2020 Alexandre Díaz

/**
 * This script is used to start the load process, act as a brigde between
 * 'page script' and 'background script'.
 */
(function() {
    "use strict";

    // Flag to run the script once
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    // This is for cross-browser compatibility
    const BrowserObj = typeof chrome === "undefined" ? browser : chrome;
    // Default collected information
    const OdooInfoObj = {
        isOdoo: false,
        isLoaded: false,
        serverVersion: null,
        isCompatible: false,
        isFrontend: false,
        serverVersionMajor: "12",
    };

    /**
     * Helper function to inject an script.
     * @param {String} script - The URL
     * @param {Function} callback - The function to call when scripts loads
     */
    function _injectPageScript(script, callback) {
        const script_page = document.createElement("script");
        script_page.setAttribute("type", "text/javascript");
        (document.head || document.documentElement).appendChild(script_page);
        if (callback) {
            script_page.onload = callback;
        }
        script_page.src = BrowserObj.extension.getURL(script);
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
        link_page.href = BrowserObj.extension.getURL(css);
    }

    /**
     * Helper function to inject multiple file types.
     * @param {Object} files - Files by type to inject
     */
    function _injector(files) {
        for (var css of files.css) {
            _injectPageCSS(css);
        }
        for (var js of files.js) {
            _injectPageScript(js);
        }
    }

    /**
     * Send Odoo Info to background.
     */
    function _sendOdooInfoToBackground() {
        BrowserObj.runtime.sendMessage({
            message: "update_terminal_badge_info",
            odooInfo: OdooInfoObj,
        });
    }

    /**
     * Update Odoo Info.
     * @param {Object} odooInfo - The collected information
     */
    function _updateOdooInfo(odooInfo) {
        if (typeof odooInfo !== "object") {
            return;
        }
        Object.assign(OdooInfoObj, odooInfo, {isLoaded: true});
        _sendOdooInfoToBackground();
    }

    /**
     * Get necessary resources to initialize the terminal
     * @param {OdooInfo} info
     * @returns {Array}
     */
    function _getTerminalResources(info) {
        // Common resources
        const to_inject = {
            css: ["odoo/css/terminal.css"],
            js: [
                "odoo/js/abstract_terminal.js",
                "odoo/js/terminal.js",
                "odoo/js/funcs/core.js",
                "odoo/js/funcs/common.js",
            ],
        };
        // Compatibility resources
        // 11 - v11
        // 12+ - v12
        const odooVersion = Number(info.serverVersionMajor);
        if (odooVersion === 11) {
            to_inject.js.push("odoo/js/compat/v11/common.js");
        }
        if (odooVersion >= 12) {
            to_inject.js.push("odoo/js/compat/v12/common.js");
        }
        // Backend/Frontend resources
        if (info.isFrontend) {
            to_inject.js.push("odoo/js/loaders/frontend.js");
        } else {
            to_inject.js = [
                "odoo/js/funcs/backend.js",
                "odoo/js/loaders/backend.js",
            ].concat(to_inject.js);
        }
        return to_inject;
    }

    // Listen messages from page script
    window.addEventListener(
        "message",
        event => {
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
                BrowserObj.storage.sync.get(["init_cmds"], result => {
                    const cmds = (result.init_cmds || "").split(/\n\r?/);
                    window.postMessage(
                        {
                            type: "ODOO_TERM_EXEC_INIT_CMDS",
                            cmds: cmds,
                        },
                        "*"
                    );
                });
            }
        },
        false
    );

    // Listen messages from background
    BrowserObj.runtime.onMessage.addListener(request => {
        if (request.message === "update_odoo_terminal_info") {
            if (OdooInfoObj.isLoaded) {
                _sendOdooInfoToBackground();
            } else {
                _injectPageScript("page_script.js", ev => {
                    ev.target.parentNode.removeChild(ev.target);
                });
            }
        } else if (request.message === "toggle_terminal") {
            if (OdooInfoObj.isCompatible) {
                document
                    .getElementById("terminal")
                    .dispatchEvent(new Event("toggle"));
            }
        }
    });
})();
