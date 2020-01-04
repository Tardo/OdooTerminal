/* global browser, chrome */
// Copyright 2019-2020 Alexandre Díaz


/**
 * This script is used to update the extension browser icon and handle the
 * 'click' event to send the 'toggle' event to the terminal widget.
 *
 * Sends the internal message 'update_odoo_terminal_info' to 'content script'
 * and the 'content script' responds with the internal message
 * 'update_terminal_badge_info'.
 */
(function () {
    "use strict";

    // This is for cross-browser compatibility
    const BrowserObj = typeof chrome === 'undefined' ? browser : chrome;

    /**
     * Handle click event.
     * @param {Object} tab - The active tab
     */
    function onClickBrowserAction (tab) {
        BrowserObj.tabs.sendMessage(tab.id, {
            message: 'toggle_terminal',
        });
    }

    /**
     * Reset the state of the action browser icon and request the collected
     * information of the page to the 'content script'
     */
    function refreshOdooInfo () {
        BrowserObj.browserAction.setIcon({
            path: 'icons/terminal-disabled-32.png',
        });
        BrowserObj.browserAction.setBadgeText({text: ''});

        // Query for active tab
        BrowserObj.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length) {
                // Request Odoo Info
                BrowserObj.tabs.sendMessage(tabs[0].id, {
                    message: 'update_odoo_terminal_info',
                });
            }
        });
    }

    /**
     * Update action browser icon.
     * @param {Object} odooInfo - Collected information
     */
    function _updateBadgeInfo (odooInfo) {
        let path = 'icons/terminal-disabled-32.png';
        if (odooInfo.isCompatible) {
            path = 'icons/terminal-32.png';
        }
        BrowserObj.browserAction.setIcon({path: path});
    }

    // Listen 'content script' reply with the collected information
    BrowserObj.runtime.onMessage.addListener(
        (request) => {
            if (request.message === 'update_terminal_badge_info') {
                _updateBadgeInfo(request.odooInfo);
            }
        });

    BrowserObj.tabs.onUpdated.addListener(refreshOdooInfo);
    BrowserObj.browserAction.onClicked.addListener(onClickBrowserAction);

}());
