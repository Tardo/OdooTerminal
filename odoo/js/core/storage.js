// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.Storage", function (require) {
    "use strict";

    const Class = require("web.Class");
    const core = require("web.core");

    const _t = core._t;
    const _lt = core._lt;

    const AbstractStorage = Class.extend({
        _parent: null,

        /**
         * @param {Widget} parent - Odoo Widget
         */
        init: function (parent) {
            this._parent = parent;
        },

        /**
         * @param {String} item
         */
        // eslint-disable-next-line
        getItem: function (item, def_value) {
            throw Error(_lt("Not Implemented!"));
        },

        /**
         * @param {String} item
         * @param {Object} value
         */
        // eslint-disable-next-line
        setItem: function (item, value, on_error = false) {
            throw Error(_lt("Not Implemented!"));
        },

        /**
         * @params {String} item
         */
        // eslint-disable-next-line
        removeItem: function (item) {
            throw Error(_lt("Not Implemented!"));
        },

        /**
         * Return a friendly error exception
         *
         * @param {Exception} err
         * @returns {Boolean}
         */
        _checkError: function (err) {
            if (err.name !== "QuotaExceededError") {
                return false;
            }
            return (
                "<span style='color:navajowhite'>" +
                `<strong>${_t("WARNING:")}</strong> ${_t("Clear the")} ` +
                "<b class='o_terminal_click o_terminal_cmd' " +
                `data-cmd='clear screen' style='color:orange;'>${_t(
                    "screen"
                )}</b> ` +
                `${_t("or/and")} ` +
                "<b class='o_terminal_click o_terminal_cmd' " +
                "data-cmd='clear history' style='color:orange;'>" +
                `${_t("history")}</b> ` +
                _t(
                    "to free storage space. Browser <u>Storage Quota Exceeded</u>"
                ) +
                " 😭 </strong><br>"
            );
        },
    });

    const StorageSession = AbstractStorage.extend({
        getItem: function (item, def_value) {
            const res = sessionStorage.getItem(item);
            if (res === null) {
                return def_value;
            }
            return JSON.parse(res);
        },

        setItem: function (item, value, on_error = false) {
            try {
                return sessionStorage.setItem(item, JSON.stringify(value));
            } catch (err) {
                if (on_error) {
                    const err_check = this._checkError(err);
                    if (err_check) {
                        on_error(err_check);
                    }
                }
            }

            return false;
        },

        removeItem: function (item) {
            return sessionStorage.removeItem(item) || undefined;
        },
    });

    const StorageLocal = AbstractStorage.extend({
        getItem: function (item, def_value) {
            const res = localStorage.getItem(item);
            if (res === null) {
                return def_value;
            }
            return JSON.parse(res);
        },

        setItem: function (item, value, on_error = false) {
            try {
                return localStorage.setItem(item, JSON.stringify(value));
            } catch (err) {
                if (on_error) {
                    const err_check = this._checkError(err);
                    if (err_check) {
                        on_error(err_check);
                    }
                }
            }

            return false;
        },

        removeItem: function (item) {
            return localStorage.removeItem(item) || undefined;
        },
    });

    return {
        AbstractStorage: AbstractStorage,
        StorageSession: StorageSession,
        StorageLocal: StorageLocal,
    };
});
