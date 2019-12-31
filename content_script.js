/* global browser, chrome */
// Copyright 2019 Alexandre Díaz


(function () {
    "use strict";

    /* Flag to run the script once */
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    const BrowserObj = typeof chrome === 'undefined' ? browser : chrome;
    const OdooInfoObj = {
        'isOdoo': false,
        'isLoaded': false,
        'serverVersion': null,
        'isCompatible': false,
        'isFrontend': false,
    };

    /* Helper function to inject an script */
    function _injectPageScript (script, autoremove=true) {
        const script_page = document.createElement('script');
        script_page.setAttribute("type", "text/javascript");
        (document.head || document.documentElement).appendChild(script_page);
        if (autoremove) {
            script_page.onload = () => {
                script_page.parentNode.removeChild(script_page);
            };
        }
        script_page.src = BrowserObj.extension.getURL(script);
    }

    /* Helper function to inject an css */
    function _injectPageCSS (css) {
        const link_page = document.createElement('link');
        link_page.setAttribute("rel", "stylesheet");
        link_page.setAttribute("type", "text/css");
        (document.head || document.documentElement).appendChild(link_page);
        link_page.href = BrowserObj.extension.getURL(css);
    }

    /* Helper function to inject multiple file types */
    function _injector (files) {
        for (var css of files.css) {
            _injectPageCSS(css);
        }
        for (var js of files.js) {
            _injectPageScript(js, false);
        }
    }

    /* Send Odoo Info to background */
    function _sendOdooInfoToBackground () {
        BrowserObj.runtime.sendMessage({
            message: 'update_terminal_badge_info',
            odooInfo: OdooInfoObj,
        });
    }

    /* Update Odoo Info */
    function _updateOdooInfo (odooInfo) {
        if (typeof odooInfo !== 'object') {
            return;
        }
        Object.assign(OdooInfoObj, odooInfo, {isLoaded: true});
        _sendOdooInfoToBackground();
    }

    /* Listen messages from page script */
    window.addEventListener("message", (event) => {
        // We only accept messages from ourselves
        if (event.source !== window) {
            return;
        }
        if (event.data.odooInfo && event.data.type === "ODOO_TERM_INIT") {
            var info = event.data.odooInfo;
            _updateOdooInfo(info);
            if (info.isCompatible) {
                const to_inject = {
                    'css': ['module/css/terminal.css'],
                    'js': [
                        'module/js/abstract_terminal.js',
                        'module/js/terminal.js',
                        'module/js/funcs/core.js',
                        'module/js/funcs/common.js',
                        `module/js/compat/v${info.serverVersionMajor}.js`,
                    ],
                };
                if (info.isFrontend) {
                    to_inject.js.push('module/js/loaders/frontend.js');
                } else {
                    to_inject.js = [
                        'module/js/funcs/backend.js',
                        'module/js/loaders/backend.js',
                    ].concat(to_inject.js);
                }
                _injector(to_inject);
            } else {
                console.warn("[OdooTerminal] Incompatible server version!");
            }
        }
    }, false);

    /* Listen messages from background */
    BrowserObj.runtime.onMessage.addListener((request) => {
        if (request.message === 'update_odoo_terminal_info') {
            if (OdooInfoObj.isLoaded) {
                _sendOdooInfoToBackground();
            } else {
                _injectPageScript('page_script.js');
            }
        } else if (request.message === 'toggle_terminal') {
            if (OdooInfoObj.isCompatible) {
                document.getElementById('terminal')
                    .dispatchEvent(new Event('toggle'));
            }
        }
    });
}());
