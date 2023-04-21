/* global browser, chrome */
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/**
 * This script is used to update the extension browser icon and handle the
 * 'click' event to send the 'toggle' event to the terminal widget.
 *
 * Sends the internal message 'update_odoo_terminal_info' to 'content script'
 * and the 'content script' reply with the internal message
 * 'update_terminal_badge_info'.
 */
(function () {
    "use strict";

    // This is for cross-browser compatibility
    const gBrowserObj = typeof chrome === "undefined" ? browser : chrome;

    /**
     * Handle browser action click event.
     * @param {Object} tab - The active tab
     */
    function onClickBrowserAction(tab) {
        gBrowserObj.tabs.sendMessage(tab.id, {
            message: "toggle_terminal",
        });
    }

    /**
     * Reset the state of the action browser icon and request the collected
     * information of the page to the 'content script'
     */
    function refreshOdooInfo() {
        gBrowserObj.browserAction.setIcon({
            path: "icons/terminal-disabled-32.png",
        });
        gBrowserObj.browserAction.setBadgeText({text: ""});

        // Query for active tab
        gBrowserObj.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs.length) {
                // Request Odoo Info
                gBrowserObj.tabs.sendMessage(tabs[0].id, {
                    message: "update_odoo_terminal_info",
                });
            }
        });
    }

    /**
     * Update action browser icon.
     * @param {Object} odoo_info - Collected information
     */
    function _updateBadgeInfo(odoo_info) {
        let path = "icons/terminal-disabled-32.png";
        if (odoo_info.isCompatible) {
            path = "icons/terminal-32.png";
        }
        gBrowserObj.browserAction.setIcon({path: path});
        gBrowserObj.browserAction.setBadgeBackgroundColor({
            color: "#71639e",
        });
        gBrowserObj.browserAction.setBadgeText({
            text: odoo_info.serverVersionRaw,
        });
    }

    // Listen 'content script' reply with the collected information
    gBrowserObj.runtime.onMessage.addListener((request) => {
        if (request.message === "update_terminal_badge_info") {
            _updateBadgeInfo(request.odooInfo);
        }
    });
    // Listen 'installed' event to set default settings
    gBrowserObj.runtime.onInstalled.addListener(() => {
        gBrowserObj.storage.sync.get(
            window.__OdooTerminal.SETTING_NAMES,
            (items) => {
                const to_update = {};
                for (const setting_name of window.__OdooTerminal
                    .SETTING_NAMES) {
                    if (
                        typeof items[setting_name] === "undefined" &&
                        typeof window.__OdooTerminal.SETTING_DEFAULTS[
                            setting_name
                        ] !== "undefined"
                    ) {
                        to_update[setting_name] =
                            window.__OdooTerminal.SETTING_DEFAULTS[
                                setting_name
                            ];
                    }
                }
                gBrowserObj.storage.sync.set(to_update);
            }
        );
    });

    // Listen actived tab and updates to update info
    gBrowserObj.tabs.onUpdated.addListener(refreshOdooInfo);
    gBrowserObj.tabs.onActivated.addListener(refreshOdooInfo);

    // Listen the extension browser icon click event to toggle terminal visibility
    gBrowserObj.browserAction.onClicked.addListener(onClickBrowserAction);
})();
