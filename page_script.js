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
    const OdooObj = window.odoo || window.openerp;
    const odooInfo = {};

    function _updateBadgeInfo () {
        // Send odooInfo to content script
        window.postMessage({
            type: "INITIALIZE",
            odooInfo: odooInfo,
        }, "*");
    }

    if (typeof OdooObj !== 'undefined') {
        Object.assign(odooInfo, {
            'isOdoo': true,
            'isOpenERP': Boolean('openerp' in window),
        });

        // Module only valid for authenticated users
        if (Object.prototype.hasOwnProperty.call(OdooObj, 'session_info') &&
                OdooObj.session_info.server_version) {
            odooInfo.serverVersion = OdooObj.session_info.server_version;
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
    }

    _updateBadgeInfo();
}());
