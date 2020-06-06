/* global browser, chrome */
// Copyright 2019-2020 Alexandre Díaz

(function() {
    "use strict";

    const gBrowserObj = typeof chrome === "undefined" ? browser : chrome;

    function _saveOptions(e) {
        e.preventDefault();
        gBrowserObj.storage.sync.set({
            init_cmds: document.querySelector("#init_cmds").value,
        });
    }

    function _onDOMLoaded() {
        gBrowserObj.storage.sync.get(["init_cmds"], result => {
            document.querySelector("#init_cmds").value = result.init_cmds || "";
        });

        document.querySelector("form").addEventListener("submit", _saveOptions);
    }

    document.addEventListener("DOMContentLoaded", _onDOMLoaded);
})();
