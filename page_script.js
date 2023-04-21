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
        "16.0",
        "saas~16.0",
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
    function _setServerVersion(ver, ver_info) {
        gOdooInfo.serverVersionRaw = ver;
        gOdooInfo.serverVersionInfo = ver_info;
        if (ver_info) {
            gOdooInfo.serverVersion = {
                major: ver_info[0],
                minor: ver_info[1],
                status: ver_info[2],
                statusLevel: ver_info[3],
            };
        } else {
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
     * Request to Odoo the version.
     */
    function _forceOdooServerVersionDetection() {
        try {
            gOdooObj.define(0, (require) => {
                require("web.core");
                const session = require("web.session");
                if (session?.server_version) {
                    _setServerVersion(session.server_version);
                    _sendInitializeSignal();
                    return;
                }
                fetch("/web/webclient/version_info", {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: "{}",
                })
                    .then((rpc_response) => {
                        return rpc_response.json();
                    })
                    .then((json_data) => {
                        _setServerVersion(
                            json_data.result.server_version,
                            json_data.result.server_version_info
                        );
                        _sendInitializeSignal();
                    });
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

        const odoo_session =
            gOdooObj.session_info ||
            gOdooObj.session ||
            gOdooObj.__DEBUG__.services["web.session"];
        if (odoo_session) {
            gOdooInfo.isFrontend = odoo_session.is_frontend;
            if (odoo_session.server_version) {
                _setServerVersion(odoo_session.server_version);
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
