// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.CommonFunctions", function(require) {
    "use strict";

    const rpc = require("web.rpc");
    const ajax = require("web.ajax");
    const session = require("web.session");
    const Terminal = require("terminal.Terminal").terminal;

    Terminal.include({
        _longpollingMode: false,

        init: function() {
            this._super.apply(this, arguments);

            this.registerCommand("create", {
                definition: "Create new record",
                callback: this._createModelRecord,
                detail: "Open new model record in form view or directly.",
                syntaxis: '<STRING: MODEL NAME> "[DICT: VALUES]"',
                args: "s?s",
            });
            this.registerCommand("unlink", {
                definition: "Unlink record",
                callback: this._unlinkModelRecord,
                detail: "Delete a record.",
                syntaxis: "<STRING: MODEL NAME> <INT: RECORD ID>",
                args: "si",
            });
            this.registerCommand("write", {
                definition: "Update record values",
                callback: this._writeModelRecord,
                detail: "Update record values.",
                syntaxis:
                    "<STRING: MODEL NAME> <INT: RECORD ID> " +
                    '"<DICT: NEW VALUES>"',
                args: "sis",
            });
            this.registerCommand("search", {
                definition: "Search model record/s",
                callback: this._searchModelRecord,
                detail:
                    "Launch orm search query.<br>[FIELDS] " +
                    "are separated by commas (without spaces) and by default " +
                    "is 'display_name'",
                syntaxis:
                    "<STRING: MODEL NAME> [STRING: FIELDS] " +
                    '"[ARRAY: DOMAIN]" [INT: LIMIT]',
                args: "s?s?s?i",
            });
            this.registerCommand("call", {
                definition: "Call model method",
                callback: this._callModelMethod,
                detail: "Call model method.",
                syntaxis: '<STRING: MODEL> <STRING: METHOD> "[ARRAY: ARGS]"',
                args: "ss?s",
            });
            this.registerCommand("upgrade", {
                definition: "Upgrade a module",
                callback: this._upgradeModule,
                detail: "Launch upgrade module process.",
                syntaxis: "<STRING: MODULE NAME>",
                args: "s",
            });
            this.registerCommand("install", {
                definition: "Install a module",
                callback: this._installModule,
                detail: "Launch module installation process.",
                syntaxis: "<STRING: MODULE NAME>",
                args: "s",
            });
            this.registerCommand("uninstall", {
                definition: "Uninstall a module",
                callback: this._uninstallModule,
                detail: "Launch module deletion process.",
                syntaxis: "<STRING: MODULE NAME>",
                args: "s",
            });
            this.registerCommand("reload", {
                definition: "Reload current page",
                callback: this._reloadPage,
                detail: "Reload current page.",
                syntaxis: "",
                args: "",
            });
            this.registerCommand("debug", {
                definition: "Set debug mode",
                callback: this._setDebugMode,
                detail:
                    "Set debug mode:<br>- 0: Disabled<br>- 1: " +
                    "Enabled<br>- 2: Enabled with Assets",
                syntaxis: "<INT: MODE>",
                args: "i",
            });
            this.registerCommand("action", {
                definition: "Call action",
                callback: this._callAction,
                detail:
                    "Call action.<br>&lt;ACTION&gt; Can be an " +
                    "string or object.",
                syntaxis: '"<STRING|DICT: ACTION>"',
                args: "s",
            });
            this.registerCommand("post", {
                definition: "Send POST request",
                callback: this._postData,
                detail: "Send POST request to selected controller url",
                syntaxis: '<STRING: CONTROLLER URL> "<DICT: DATA>"',
                args: "ss",
            });
            this.registerCommand("whoami", {
                definition: "Know current user login",
                callback: this._showWhoAmI,
                detail: "Shows current user login",
                syntaxis: "",
                args: "",
            });
            this.registerCommand("caf", {
                definition: "Check model fields access",
                callback: this._checkFieldAccess,
                detail: "Show readable/writeable fields of the selected model",
                syntaxis: '<STRING: MODEL> "[ARRAY: FIELDS]"',
                args: "s?s",
            });
            this.registerCommand("cam", {
                definition: "Check model access",
                callback: this._checkModelAccess,
                detail:
                    "Show access rights for the selected operation on the" +
                    " selected model" +
                    "<br>&lt;OPERATION&gt; Can be 'create', 'read', 'write'" +
                    " or 'unlink'",
                syntaxis: "<STRING: MODEL> <STRING: OPERATION>",
                args: "ss",
            });
            this.registerCommand("lastseen", {
                definition: "Know user presence",
                callback: this._lastSeen,
                detail: "Show users last seen",
                syntaxis: "",
                args: "",
            });
            this.registerCommand("searchid", {
                definition: "Search model record",
                callback: this._searchModelRecordId,
                detail:
                    "Launch orm search query.<br>[FIELDS] " +
                    "are separated by commas (without spaces) and by default " +
                    "is 'display_name'",
                syntaxis:
                    "<STRING: MODEL NAME> <INT: RECORD ID> " +
                    "[STRING: FIELDS]",
                args: "si?s",
            });
            this.registerCommand("context", {
                definition: "Operations over session context dictionary",
                callback: this._contextOperation,
                detail:
                    "Operations over session context dictionary." +
                    "<br>[OPERATION] can be 'read', 'write' or 'set'. " +
                    "By default is 'read'. ",
                syntaxis: '[STRING: OPERATION] "[DICT: VALUES]" ',
                args: "?s?s",
            });
            this.registerCommand("version", {
                definition: "Know Odoo version",
                callback: this._showOdooVersion,
                detail: "Shows Odoo version",
                syntaxis: "",
                args: "",
            });
            this.registerCommand("longpolling", {
                definition: "Long-Polling operations",
                callback: this._longpolling,
                detail:
                    "Operations over long-polling." +
                    "<br>[OPERATION] can be 'verbose', 'off' or empty. " +
                    "If empty, prints current value.",
                syntaxis: "[STRING: OPERATION]",
                args: "?s",
            });
            this.registerCommand("login", {
                definition: "Login as...",
                callback: this._loginAs,
                detail:
                    "Login as selected user." +
                    "<br>&lt;LOGIN&gt; Can be optionally preceded by the '-'" +
                    "character and it will be used for password too",
                syntaxis:
                    "<STRING: DATABASE> <STRING: LOGIN> [STRING: PASSWORD]",
                args: "ss?s",
                secured: true,
            });
            this.registerCommand("uhg", {
                definition: "Check if user is in the selected groups",
                callback: this._userHasGroups,
                detail:
                    "Check if user is in the selected groups." +
                    "<br>&lt;GROUPS&gt; A list of groups separated by " +
                    "commas, a group can be optionally preceded by '!' to " +
                    "say 'is not in group'",
                syntaxis: "<STRING: GROUPS>",
                args: "s",
            });
        },

        start: function() {
            this._super.apply(this, arguments);

            this._longpollingMode = this._storage.getItem(
                "terminal_longpolling_mode"
            );
        },

        _userHasGroups: function(params) {
            const groups = params[0];
            const self = this;
            return rpc
                .query({
                    method: "user_has_groups",
                    model: "res.users",
                    args: [groups],
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    self.print(result);
                });
        },

        _loginAs: function(params) {
            const db = params[0];
            var login = params[1];
            var passwd = params[2] || false;
            var self = this;
            if (login[0] === "-" && !passwd) {
                login = login.substr(1);
                passwd = login;
            }
            return session
                ._session_authenticate(db, login, passwd)
                .then(function() {
                    self.print(`Successfully logged as '${login}'`);
                });
        },

        _longpolling: function(params) {
            const operation = params[0];
            const self = this;
            return $.Deferred(d => {
                if (typeof operation === "undefined") {
                    self.print(
                        self._storage.getItem("terminal_longpolling_mode") ||
                            "off"
                    );
                } else if (operation === "verbose") {
                    self._storage.setItem(
                        "terminal_longpolling_mode",
                        "verbose"
                    );
                    self.print("Now long-polling is in verbose mode.");
                } else if (operation === "off") {
                    self._storage.removeItem("terminal_longpolling_mode");
                    self.print("Now long-polling verbose mode is disabled");
                } else {
                    d.reject("Invalid operation");
                }

                d.resolve();
            });
        },

        _showOdooVersion: function() {
            const self = this;
            return $.Deferred(d => {
                try {
                    self.print(
                        `${odoo.session_info.server_version_info
                            .slice(0, 3)
                            .join(
                                "."
                            )} (${odoo.session_info.server_version_info
                            .slice(3)
                            .join(" ")})`
                    );
                    d.resolve();
                } catch (err) {
                    self.print(window.term_odooVersion);
                }

                d.resolve();
            });
        },

        _contextOperation: function(params) {
            const operation = params[0] || "read";
            const values = params[1] || "false";

            const self = this;
            return $.Deferred(d => {
                if (operation === "read") {
                    self.print(session.user_context);
                } else if (operation === "set") {
                    session.user_context = JSON.parse(values);
                    self.print(session.user_context);
                } else if (operation === "write") {
                    Object.assign(session.user_context, JSON.parse(values));
                    self.print(session.user_context);
                } else {
                    d.reject("Invalid operation");
                }

                d.resolve();
            });
        },

        _searchModelRecordId: function(params) {
            const model = params[0];
            const recordid = Number(params[1]);
            let fields = ["display_name"];
            if (params[2]) {
                fields = params[2] === "*" ? false : params[2].split(",");
            }
            const self = this;
            return rpc
                .query({
                    method: "search_read",
                    domain: [["id", "=", recordid]],
                    fields: fields,
                    model: model,
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    let tbody = "";
                    const columns = ["id"];
                    for (const item of result) {
                        tbody += "<tr>";
                        tbody += _.template(
                            "<td><span class='o_terminal_click " +
                                "o_terminal_view' data-resid='<%= id %>' " +
                                "data-model='<%= model %>'>#<%= id %></span></td>"
                        )({
                            id: item.id,
                            model: model,
                        });
                        delete item.id;
                        for (const field in item) {
                            columns.push(field);
                            tbody += `<td>${item[field]}</td>`;
                        }
                        tbody += "</tr>";
                    }
                    self.printTable(_.unique(columns), tbody);
                });
        },

        _lastSeen: function() {
            return rpc
                .query({
                    method: "search_read",
                    fields: ["user_id", "last_presence"],
                    model: "bus.presence",
                    order: "last_presence DESC",
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    let body = "";
                    for (const record of result) {
                        body +=
                            `<tr><td>${record.user_id[1]}</td>` +
                            `<td>${record.user_id[0]}</td>` +
                            `<td>${record.last_presence}</td></tr>`;
                    }

                    this.printTable(
                        ["User Name", "User ID", "Last Seen"],
                        body
                    );
                });
        },

        _checkModelAccess: function(params) {
            const model = params[0];
            const operation = params[1];
            return rpc
                .query({
                    method: "check_access_rights",
                    model: model,
                    args: [operation, false],
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    if (result) {
                        this.print(`Nice! you can '${operation}' on ${model}`);
                    } else {
                        this.print(`You can't '${operation}' on ${model}`);
                    }
                });
        },

        _checkFieldAccess: function(params) {
            const model = params[0];
            const fields = params[1] || "false";
            return rpc
                .query({
                    method: "fields_get",
                    model: model,
                    args: [JSON.parse(fields)],
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    const keys = Object.keys(result);
                    const fieldParams = [
                        "type",
                        "string",
                        "relation",
                        "required",
                        "readonly",
                        "searchable",
                        "depends",
                    ];

                    let body = "";
                    for (const field of keys) {
                        body += "<tr>";
                        body += `<td>${field}</td>`;
                        const fieldDef = result[field];
                        for (const param of fieldParams) {
                            body += `<td>${fieldDef[param]}</td>`;
                        }
                        body += "</tr>";
                    }
                    fieldParams.unshift("field");
                    this.printTable(fieldParams, body);
                });
        },

        _WHOAMI_TEMPLATE:
            "<span style='color: gray;'>Login</span>:" +
            ` <%= login %>` +
            "<br><span style='color: gray;'>Partner</span>:" +
            " <%= partner[1] %> (#<%= partner[0] %>)" +
            "<br><span style='color: gray;'>Company</span>:" +
            " <%= company[1] %> (#<%= company[0] %>)" +
            "<br><span style='color: gray;'>Allowed Companies</span>:" +
            " <%= companies %>" +
            "<br><span style='color: gray;'>Groups</span>:" +
            " <%= groups %>",
        _showWhoAmI: function() {
            const self = this;
            const uid =
                window.odoo.session_info.uid ||
                window.odoo.session_info.user_id;
            return rpc
                .query({
                    method: "search_read",
                    domain: [["id", "=", uid]],
                    fields: [
                        "login",
                        "partner_id",
                        "company_id",
                        "company_ids",
                        "groups_id",
                    ],
                    model: "res.users",
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    if (result.length) {
                        const record = result[0];
                        self.print(
                            _.template(self._WHOAMI_TEMPLATE)({
                                login: record.login,
                                partner: record.partner_id,
                                company: record.company_id,
                                companies: record.company_ids,
                                groups: record.groups_id,
                            })
                        );
                    } else {
                        self.print("[!] Oops! can't get the login :/");
                    }
                });
        },

        _setDebugMode: function(params) {
            const mode = Number(params[0]);
            if (mode === 0) {
                this.print(
                    "Debug mode <strong>disabled</strong>. Reloading page..."
                );
                const qs = $.deparam.querystring();
                delete qs.debug;
                window.location.search = "?" + $.param(qs);
            } else if (mode === 1) {
                this.print(
                    "Debug mode <strong>enabled</strong>. Reloading page..."
                );
                window.location = $.param.querystring(
                    window.location.href,
                    "debug=1"
                );
            } else if (mode === 2) {
                this.print(
                    "Debug mode with assets <strong>enabled</strong>. " +
                        "Reloading page..."
                );
                window.location = $.param.querystring(
                    window.location.href,
                    "debug=assets"
                );
            } else {
                this.print("[!] Invalid debug mode");
            }

            return $.Deferred(d => {
                d.resolve();
            });
        },

        _reloadPage: function() {
            return $.Deferred(d => {
                try {
                    location.reload();
                    d.resolve();
                } catch (err) {
                    d.reject(err.message);
                }
            });
        },

        _searchModule: function(module) {
            return rpc.query({
                method: "search_read",
                domain: [["name", "=", module]],
                fields: ["name"],
                model: "ir.module.module",
                kwargs: {context: session.user_context},
            });
        },

        _upgradeModule: function(params) {
            const module = params[0];
            const self = this;
            return this._searchModule(module).then(result => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_upgrade",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            self.print(
                                `'${module}' module successfully upgraded`
                            );
                        },
                        () => {
                            self.print(`[!] Can't upgrade '${module}' module`);
                        }
                    );
                } else {
                    self.print(`[!] '${module}' module doesn't exists`);
                }
            });
        },

        _installModule: function(params) {
            const module = params[0];
            const self = this;
            return this._searchModule(module).then(result => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_install",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            self.print(
                                `'${module}' module successfully installed`
                            );
                        },
                        () => {
                            self.print(`[!] Can't install '${module}' module`);
                        }
                    );
                } else {
                    self.print(`[!] '${module}' module doesn't exists`);
                }
            });
        },

        _uninstallModule: function(params) {
            const module = params[0];
            const self = this;
            return this._searchModule(module).then(result => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_uninstall",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            self.print(
                                `'${module}' module successfully uninstalled`
                            );
                        },
                        () => {
                            self.print(
                                `[!] Can't uninstall '${module}' module`
                            );
                        }
                    );
                } else {
                    self.print(`[!] '${module}' module doesn't exists`);
                }
            });
        },

        _callModelMethod: function(params) {
            const model = params[0];
            const method = params[1];
            const args = params[2] || "[]";
            const self = this;
            return rpc
                .query({
                    method: method,
                    model: model,
                    args: JSON.parse(args),
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    self.print(result);
                });
        },

        _searchModelRecord: function(params) {
            const model = params[0];
            let fields = ["display_name"];
            if (params[1]) {
                fields = params[1] === "*" ? false : params[1].split(",");
            }
            const domain = params[2] || "[]";
            const limit = Number(params[3]) || false;
            const self = this;
            return rpc
                .query({
                    method: "search_read",
                    domain: JSON.parse(domain),
                    fields: fields,
                    model: model,
                    limit: limit,
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    let tbody = "";
                    const columns = ["id"];
                    for (const item of result) {
                        tbody += "<tr>";
                        tbody += _.template(
                            "<td><span class='o_terminal_click " +
                                "o_terminal_view' data-resid='<%= id %>' " +
                                "data-model='<%= model %>'>#<%= id %></span></td>"
                        )({
                            id: item.id,
                            model: model,
                        });
                        delete item.id;
                        for (const field in item) {
                            columns.push(field);
                            tbody += `<td>${item[field]}</td>`;
                        }
                        tbody += "</tr>";
                    }
                    self.printTable(_.unique(columns), tbody);
                });
        },

        _createModelRecord: function(params) {
            const model = params[0];
            const self = this;
            if (params.length === 1) {
                return this.do_action({
                    type: "ir.actions.act_window",
                    res_model: model,
                    views: [[false, "form"]],
                    target: "current",
                }).then(() => {
                    self.do_hide();
                });
            }
            const values = params[1];
            return rpc
                .query({
                    method: "create",
                    model: model,
                    args: [JSON.parse(values)],
                    kwargs: {context: session.user_context},
                })
                .then(result => {
                    self.print(
                        _.template(
                            "<%= model %> record created " +
                                "successfully: <span class='o_terminal_click " +
                                "o_terminal_view' data-resid='<%= new_id %>' " +
                                "data-model='<%= model %>'><%= new_id %></span>"
                        )({
                            model: model,
                            new_id: result,
                        })
                    );
                });
        },

        _unlinkModelRecord: function(params) {
            const model = params[0];
            const record_id = parseInt(params[1], 10);
            const self = this;
            return rpc
                .query({
                    method: "unlink",
                    model: model,
                    args: [record_id],
                    kwargs: {context: session.user_context},
                })
                .then(() => {
                    self.print(`${model} record deleted successfully`);
                });
        },

        _writeModelRecord: function(params) {
            const model = params[0];
            const record_id = parseInt(params[1], 10);
            let values = params[2];
            try {
                values = JSON.parse(values);
            } catch (err) {
                const defer = $.Deferred(d => {
                    d.reject(err.message);
                });
                return defer;
            }
            const self = this;
            return rpc
                .query({
                    method: "write",
                    model: model,
                    args: [record_id, values],
                    kwargs: {context: session.user_context},
                })
                .then(() => {
                    self.print(`${model} record updated successfully`);
                });
        },

        _callAction: function(params) {
            let action = params[0];
            try {
                action = JSON.parse(action);
            } catch (err) {
                // Do Nothing
            }
            return this.do_action(action);
        },

        _postData: function(params) {
            const url = params[0];
            const data = params[1];
            const self = this;
            return ajax.post(url, JSON.parse(data)).then(result => {
                self.print(result);
            });
        },

        //
        _onBusNotification: function(notifications) {
            const longpollingMode = this._storage.getItem(
                "terminal_longpolling_mode"
            );
            if (longpollingMode !== "verbose") {
                return;
            }
            for (const notif of notifications) {
                this.print("- Notification incoming...");
                this.print(notif);
            }
        },
    });
});
