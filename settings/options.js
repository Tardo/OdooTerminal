/* global browser, chrome */
// Copyright 2019 Alexandre Díaz


(function () {
    "use strict";

    const BrowserObj = typeof chrome === 'undefined' ? browser : chrome;

    function saveOptions (e) {
        e.preventDefault();
        BrowserObj.storage.sync.set({
            init_cmds: document.querySelector("#init_cmds").value,
        });
    }

    function restoreOptions () {
        BrowserObj.storage.sync.get(["init_cmds"], (result) => {
            document.querySelector("#init_cmds").value = result.init_cmds || "";
        });
    }

    document.addEventListener("DOMContentLoaded", restoreOptions);
    document.querySelector("form").addEventListener("submit", saveOptions);
}());
