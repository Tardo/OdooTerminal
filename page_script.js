// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/**
 * This script is used to collect information about Odoo (if can do it) used
 * to know if can run the terminal and how do it.
 */
(function () {
    "use strict";

    // Flag to run the script once
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    const COMPATIBLE_VERS = [
        "11.",
        "saas~11",
        "12.",
        "saas~12",
        "13.",
        "saas~13",
        "14.",
        "saas~14",
        "15.",
        "saas~15",
    ];
    const gOdooObj = window.odoo;
    const gOdooInfo = {};

    /**
     * Sends the collected information to the 'content script'.
     */
    function _sendInitializeSignal() {
        // Send gOdooInfo to content script
        window.postMessage(
            {
                type: "ODOO_TERM_INIT",
                odooInfo: gOdooInfo,
            },
            "*"
        );
    }

    /**
     * Helper function to sanitize the server version.
     * @param {String} ver - Odoo version
     */
    function _setServerVersion(ver) {
        gOdooInfo.serverVersionRaw = ver;
        const foundVer = gOdooInfo.serverVersionRaw.match(
            /(\d+)\.(\d+)(?:([a-z]+)(\d*))?/
        );
        if (foundVer && foundVer.length) {
            gOdooInfo.serverVersion = {
                major: Number(foundVer[1]),
                minor: Number(foundVer[2]),
                status: foundVer[3],
                statusLevel: foundVer[4] && Number(foundVer[4]),
            };
        }
        const cvers = COMPATIBLE_VERS.filter(function (item) {
            return gOdooInfo.serverVersionRaw.startsWith(item);
        });
        if (cvers.length) {
            gOdooInfo.isCompatible = true;
            window.term_odooVersionRaw = gOdooInfo.serverVersionRaw;
        } else if (Object.hasOwn(window, "term_odooVersionRaw")) {
            delete window.term_odooVersionRaw;
        }
    }

    /**
     * Factory function to create RPC.
     * @param {String} url
     * @param {String} fct_name - Function name
     * @param {Object} params - RPC parameters
     * @param {Function} on_fulfilled
     * @param {Function} on_rejected
     */
    function _createRpc(url, fct_name, params, on_fulfilled, on_rejected) {
        if (!Object.hasOwn(params, "args")) {
            params.args = {};
        }

        $.ajax(url, {
            url: url,
            dataType: "json",
            type: "POST",
            data: JSON.stringify({
                jsonrpc: "2.0",
                method: fct_name,
                params: params,
                id: Math.floor(Math.random() * 1000 * 1000 * 1000),
            }),
            contentType: "application/json",
        }).then(on_fulfilled, on_rejected);
    }

    /**
     * Factory function to create RPC (Service type).
     * @param {Object} params - RPC parameters
     * @param {Function} on_fulfilled
     * @param {Function} on_rejected
     */
    function _createServiceRpc(params, on_fulfilled, on_rejected) {
        _createRpc("/jsonrpc", "service", params, on_fulfilled, on_rejected);
    }

    /**
     * Request to Odoo the version.
     */
    function _forceOdooServerVersionDetection() {
        try {
            gOdooObj.define(0, (require) => {
                require("web.core");
                _createServiceRpc(
                    {
                        service: "db",
                        method: "server_version",
                    },
                    (rpc_response) => {
                        const version = rpc_response.result;
                        if (
                            typeof version !== "undefined" &&
                            typeof version === "string"
                        ) {
                            _setServerVersion(version);
                        }
                        _sendInitializeSignal();
                    }
                );
            });
        } catch (exception) {
            // Do nothing
            // Older versions are not supported
        }
    }

    /**
     * Heuristic method to determine backend mode
     *
     * @returns {Boolean}
     */
    function _forceIsOdooBackendDetection() {
        return (
            document.querySelector("head script[src*='assets_frontend']") ===
            null
        );
    }

    let gCanInitialize = true;
    if (typeof gOdooObj !== "undefined") {
        Object.assign(gOdooInfo, {
            isOdoo: true,
        });

        if (Object.hasOwn(gOdooObj, "session_info")) {
            gOdooInfo.isFrontend = gOdooObj.session_info.is_frontend;
            if (gOdooObj.session_info.server_version) {
                _setServerVersion(gOdooObj.session_info.server_version);
            } else {
                if (!gOdooInfo.isFrontend) {
                    // Ensure that is not front-end (portal)
                    gOdooInfo.isFrontend = !_forceIsOdooBackendDetection();
                }

                _forceOdooServerVersionDetection();
                gCanInitialize = false;
            }
        } else {
            gOdooInfo.isFrontend = !_forceIsOdooBackendDetection();
            _forceOdooServerVersionDetection();
            gCanInitialize = false;
        }
    }
    if (gCanInitialize) {
        _sendInitializeSignal();
    }
})();
