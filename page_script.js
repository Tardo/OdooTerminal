// Copyright 2019 Alexandre Díaz


(function () {
    "use strict";

    /* Flag to run the script once */
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    const COMPATIBLE_VERS = [
        '11.0', 'saas~11',
        '12.0', 'saas~12',
        '13.0', 'saas~13',
    ];
    const OdooObj = window.odoo;
    const odooInfo = {};

    function _sendInitializeSignal () {
        // Send odooInfo to content script
        window.postMessage({
            type: "ODOO_TERM_INIT",
            odooInfo: odooInfo,
        }, "*");
    }

    function _setServerVersion (ver) {
        odooInfo.serverVersion = ver;
        const foundVer = odooInfo.serverVersion.match(/\d+/);
        if (foundVer && foundVer.length) {
            odooInfo.serverVersionMajor = foundVer[0];
        }
        const cvers = COMPATIBLE_VERS.filter(
            (item) => odooInfo.serverVersion.startsWith(item));
        if (cvers.length) {
            odooInfo.isCompatible = true;
        }
    }

    function _createRpc (url, fct_name, params, onFulfilled, onRejected) {
        if (!('args' in params)) {
            params.args = {};
        }
        if ('define' in OdooObj) {
            OdooObj.define(0, function (require) {
                var ajax = require('web.ajax');
                if ('rpc' in ajax) {
                    ajax.rpc(url, params).then(onFulfilled, onRejected);
                } else if ('jsonRpc' in ajax) {
                    ajax.jsonRpc(url, fct_name, params).then(
                        onFulfilled, onRejected);
                }
            });
        }
    }

    function _createServiceRpc (params, onFulfilled, onRejected) {
        _createRpc('/jsonrpc', 'service', params, onFulfilled, onRejected);
    }

    function _forceOdooServerVersionDetection () {
        _createServiceRpc({
            'service': 'db',
            'method': 'server_version',
        }, (version) => {
            if (!_.isUndefined(version) && typeof version === 'string') {
                _setServerVersion(version);
            }
            _sendInitializeSignal();
        });
    }

    let canInitialize = true;
    if (typeof OdooObj !== 'undefined') {
        Object.assign(odooInfo, {
            'isOdoo': true,
        });

        // Module only valid for authenticated users
        if (Object.prototype.hasOwnProperty.call(OdooObj, 'session_info')) {
            if (OdooObj.session_info.server_version) {
                _setServerVersion(OdooObj.session_info.server_version);
            } else {
                if (OdooObj.session_info.is_frontend) {
                    odooInfo.isFrontend = true;
                }
                _forceOdooServerVersionDetection();
                canInitialize = false;
            }
        }
    }
    if (canInitialize) {
        _sendInitializeSignal();
    }
}());
