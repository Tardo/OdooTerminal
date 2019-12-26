/* global browser, chrome */
// Copyright 2019 Alexandre Díaz


(function () {
    "use strict";

    const BrowserObj = typeof chrome === 'undefined' ? browser : chrome;

    /* Handle click event */
    function onClickBrowserAction (tab) {
        BrowserObj.tabs.sendMessage(tab.id, {
            message: 'toggle_terminal',
        });
    }

    /* Refresh browser action icon */
    function refreshOdooInfo () {
        BrowserObj.browserAction.setIcon({
            path: 'icons/terminal-disabled-32.png',
        });
        BrowserObj.browserAction.setBadgeText({text: ''});

        /* Query for active tab */
        BrowserObj.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length) {

                /* Request Odoo Info */
                BrowserObj.tabs.sendMessage(tabs[0].id, {
                    message: 'update_odoo_terminal_info',
                });
            }
        });
    }

    function _updateBadgeInfo (odooInfo) {
        let path = 'icons/terminal-disabled-32.png';
        if (odooInfo.isCompatible) {
            path = 'icons/terminal-32.png';
        }
        BrowserObj.browserAction.setIcon({path: path});
    }

    BrowserObj.runtime.onMessage.addListener(
        (request) => {
            if (request.message === 'update_terminal_badge_info') {
                _updateBadgeInfo(request.odooInfo);
            }
        });

    BrowserObj.tabs.onUpdated.addListener(refreshOdooInfo);
    BrowserObj.browserAction.onClicked.addListener(onClickBrowserAction);

}());
