// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

window.__OdooTerminal = {
    SETTING_TYPES: {
        init_cmds: "edit",
        term_context: "json",
        pinned: "check",
        maximized: "check",
        opacity: "int",
        shortcuts: "manual",
    },
    SETTING_DEFAULTS: {
        init_cmds: "",
        term_context: {active_test: false},
        pinned: false,
        maximized: false,
        opacity: 93,
        shortcuts: {'["Ctrl",","]': "toggle_term"},
    },
    IGNORED_KEYS: ["Control", "Meta", "Shift", "Alt", "Escape"],
};
window.__OdooTerminal.SETTING_NAMES = Object.keys(
    window.__OdooTerminal.SETTING_TYPES
);

window.__OdooTerminal.process_keybind = function (e) {
    "use strict";
    const keybind = [];
    if (e.altKey) {
        keybind.push("Alt");
    }
    if (e.ctrlKey) {
        keybind.push("Ctrl");
    }
    if (e.shiftKey) {
        keybind.push("Shift");
    }
    if (e.metaKey) {
        keybind.push("Meta");
    }
    if (e.key === "Escape") {
        keybind.push("Escape");
    }
    if (window.__OdooTerminal.IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
        keybind.push(e.key);
    }
    return keybind;
};
