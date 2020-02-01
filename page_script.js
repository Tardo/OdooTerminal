// Copyright 2019-2020 Alexandre Díaz

/**
 * This script is used to collect information about Odoo (if can do it) used
 * to know if can run the terminal and how do it.
 */
(function() {
    "use strict";

    // Flag to run the script once
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    const COMPATIBLE_VERS = [
        "11.0",
        "saas~11",
        "12.0",
        "saas~12",
        "13.0",
        "saas~13",
        "14.0",
        "saas~14",
    ];
    const OdooObj = window.odoo;
    const odooInfo = {};

    /**
     * Sends the collected information to the 'content script'.
     */
    function _sendInitializeSignal() {
        // Send odooInfo to content script
        window.postMessage(
            {
                type: "ODOO_TERM_INIT",
                odooInfo: odooInfo,
            },
            "*"
        );
    }

    /**
     * Helper function to sanitize the server version.
     * @param {String} ver - Odoo version
     */
    function _setServerVersion(ver) {
        odooInfo.serverVersion = ver;
        const foundVer = odooInfo.serverVersion.match(/\d+/);
        if (foundVer && foundVer.length) {
            odooInfo.serverVersionMajor = foundVer[0];
        }
        const cvers = COMPATIBLE_VERS.filter(function(item) {
            return odooInfo.serverVersion.startsWith(item);
        });
        if (cvers.length) {
            odooInfo.isCompatible = true;
            window.term_odooVersion = odooInfo.serverVersion;
            window.term_odooVersionMajor = odooInfo.serverVersionMajor;
        } else {
            if (
                Object.prototype.hasOwnProperty.call(window, "term_odooVersion")
            ) {
                delete window.term_odooVersion;
            }
            if (
                Object.prototype.hasOwnProperty.call(
                    window,
                    "term_odooVersionMajor"
                )
            ) {
                delete window.term_odooVersionMajor;
            }
        }
    }

    /**
     * Factory function to create RPC.
     * @param {String} url
     * @param {String} fct_name - Function name
     * @param {Object} params - RPC parameters
     * @param {Function} onFulfilled
     * @param {Function} onRejected
     */
    function _createRpc(url, fct_name, params, onFulfilled, onRejected) {
        if (!("args" in params)) {
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
        }).then(onFulfilled, onRejected);
    }

    /**
     * Factory function to create RPC (Service type).
     * @param {Object} params - RPC parameters
     * @param {Function} onFulfilled
     * @param {Function} onRejected
     */
    function _createServiceRpc(params, onFulfilled, onRejected) {
        _createRpc("/jsonrpc", "service", params, onFulfilled, onRejected);
    }

    /**
     * Request to Odoo the version.
     */
    function _forceOdooServerVersionDetection() {
        _createServiceRpc(
            {
                service: "db",
                method: "server_version",
            },
            rpc_response => {
                const version = rpc_response.result;
                if (!_.isUndefined(version) && typeof version === "string") {
                    _setServerVersion(version);
                }
                _sendInitializeSignal();
            }
        );
    }

    let canInitialize = true;
    if (typeof OdooObj !== "undefined") {
        Object.assign(odooInfo, {
            isOdoo: true,
        });

        if (Object.prototype.hasOwnProperty.call(OdooObj, "session_info")) {
            if (OdooObj.session_info.server_version) {
                _setServerVersion(OdooObj.session_info.server_version);
            } else {
                if (OdooObj.session_info.is_frontend) {
                    odooInfo.isFrontend = true;
                }

                try {
                    OdooObj.define(0, require => {
                        require("web.core");
                        _forceOdooServerVersionDetection();
                    });
                } catch (exception) {
                    // Do nothing
                    // Older versions are not supported
                }
                canInitialize = false;
            }
        }
    }
    if (canInitialize) {
        _sendInitializeSignal();
    }
})();
