/* global browser, chrome */
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

(function () {
    "use strict";

    const gBrowserObj = typeof chrome === "undefined" ? browser : chrome;

    let unique_counter = 1;
    let shortcuts_defs = {};

    function onClickShortcutRemove(e) {
        const row_target_id = e.target.dataset.target;
        const row = document.querySelector(`#${row_target_id}`);
        row.parentNode.removeChild(row);
        const keybind = e.target.dataset.keybind;
        delete shortcuts_defs[keybind];
    }

    function renderShortcutTableItem(
        elm_shortcut_table,
        shortcut_keybind,
        shortcut_cmds
    ) {
        const row_id = `shorcut-${unique_counter++}`;
        const tbody = elm_shortcut_table.getElementsByTagName("tbody")[0];
        const new_row = tbody.insertRow();
        const new_cell_keybind = new_row.insertCell(0);
        const new_cell_cmds = new_row.insertCell(1);
        const new_cell_options = new_row.insertCell(2);
        new_row.setAttribute("id", row_id);
        new_cell_keybind.innerText = JSON.parse(shortcut_keybind || "[]").join(
            " + "
        );
        new_cell_cmds.innerText = shortcut_cmds;
        const elm_link_remove = document.createElement("a");
        elm_link_remove.id = `${row_id}-remove'`;
        elm_link_remove.innerText = "Remove";
        elm_link_remove.href = "#";
        elm_link_remove.classList.add("shortcut_remove");
        elm_link_remove.dataset.target = row_id;
        elm_link_remove.dataset.keybind = shortcut_keybind;
        new_cell_options.appendChild(elm_link_remove);
        elm_link_remove.addEventListener("click", onClickShortcutRemove, false);
    }

    function renderShortcutTable() {
        const elm_shortcut_table = document.querySelector("#shorcut_table");
        const tbody = elm_shortcut_table.getElementsByTagName("tbody")[0];
        while (tbody.rows.length > 0) {
            tbody.deleteRow(0);
        }
        for (const shortcut_keybind in shortcuts_defs) {
            renderShortcutTableItem(
                elm_shortcut_table,
                shortcut_keybind,
                shortcuts_defs[shortcut_keybind]
            );
        }
    }

    function saveOptions() {
        const data = {};
        for (const name of window.__OdooTerminal.SETTING_NAMES) {
            const type = window.__OdooTerminal.SETTING_TYPES[name];
            if (type === "manual") {
                continue;
            }
            const target = document.querySelector(`#${name}`);
            let value = "";
            if (type === "edit" || type === "int") {
                value = target.value;
            } else if (type === "check") {
                value = target.checked;
            } else if (type === "json") {
                value = JSON.parse(target.value);
            }
            data[name] = value;
        }
        data.shortcuts = shortcuts_defs;
        gBrowserObj.storage.sync.set(data);
    }

    function applyInputValues() {
        gBrowserObj.storage.sync.get(
            window.__OdooTerminal.SETTING_NAMES,
            (result) => {
                const cmd_names = Object.keys(result);
                for (const name of cmd_names) {
                    const type = window.__OdooTerminal.SETTING_TYPES[name];
                    if (type === "manual") {
                        continue;
                    }
                    const item = document.querySelector(`#${name}`);
                    if (type === "edit") {
                        item.value = result[name] || "";
                    } else if (type === "check") {
                        item.checked = result[name] || false;
                    } else if (type === "int") {
                        item.value = result[name] || 0;
                    } else if (type === "json") {
                        item.value =
                            JSON.stringify(result[name], null, 4) || "{}";
                    }
                }
                shortcuts_defs = result.shortcuts || {};
                renderShortcutTable();
            }
        );
    }

    function onSubmitForm(e) {
        e.preventDefault();
        saveOptions();
    }

    function onKeyDownShortcut(e) {
        const keybind = window.__OdooTerminal.process_keybind(e);
        if (window.__OdooTerminal.IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
            e.target.dataset.keybind = JSON.stringify(keybind);
            e.target.value = keybind.join(" + ");
        } else {
            e.target.dataset.keybind = "";
            if (keybind.length) {
                e.target.value = `${keybind.join(" + ")} + `;
            } else {
                e.target.value = "";
            }
        }
        e.preventDefault();
    }

    function onKeyUpShortcut(e) {
        if (!e.target.dataset.keybind) {
            e.target.value = "";
        }
    }

    function onClickShortcutAdd() {
        const elm_shortcut_keybind =
            document.querySelector("#shortcut_keybind");
        const elm_shortcut_cmds = document.querySelector("#shortcut_commands");
        if (elm_shortcut_keybind.value && elm_shortcut_cmds.value) {
            const elm_shortcut_table = document.querySelector("#shorcut_table");
            shortcuts_defs[elm_shortcut_keybind.dataset.keybind] =
                elm_shortcut_cmds.value;
            renderShortcutTableItem(
                elm_shortcut_table,
                elm_shortcut_keybind.dataset.keybind,
                elm_shortcut_cmds.value
            );
            elm_shortcut_keybind.value = "";
            elm_shortcut_cmds.value = "";
        }
    }

    function onClickResetSettings() {
        gBrowserObj.storage.sync.set(window.__OdooTerminal.SETTING_DEFAULTS);
        applyInputValues();
    }

    function onDOMLoaded() {
        applyInputValues();
        document.querySelector("form").addEventListener("submit", onSubmitForm);
        document
            .querySelector("#shortcut_keybind")
            .addEventListener("keydown", onKeyDownShortcut);
        document
            .querySelector("#shortcut_keybind")
            .addEventListener("keyup", onKeyUpShortcut);
        document
            .querySelector("#add_shortcut")
            .addEventListener("click", onClickShortcutAdd);
        document
            .querySelector("#reset_settings")
            .addEventListener("click", onClickResetSettings);
    }

    document.addEventListener("DOMContentLoaded", onDOMLoaded);
})();
