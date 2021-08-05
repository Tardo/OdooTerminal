// Copyright 2018-2021 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.functions.Common", function (require) {
    "use strict";

    const tour = require("web_tour.tour");
    const rpc = require("web.rpc");
    const ajax = require("web.ajax");
    const session = require("web.session");
    const Terminal = require("terminal.Terminal");
    const Utils = require("terminal.core.Utils");

    Terminal.include({
        custom_events: _.extend({}, Terminal.prototype.custom_events, {
            longpolling_notification: "_onBusNotification",
        }),

        init: function () {
            this._super.apply(this, arguments);

            // Someone said 'registerCommand' ?¿?? O_o
            this.registerCommand("create", {
                definition: "Create new record",
                callback: this._cmdCreateModelRecord,
                detail: "Open new model record in form view or directly.",
                syntax: '<STRING: MODEL NAME> "[DICT: VALUES]"',
                args: "s?j",
                example: "res.partner \"{'name': 'Poldoore'}\"",
            });
            this.registerCommand("unlink", {
                definition: "Unlink record",
                callback: this._cmdUnlinkModelRecord,
                detail: "Delete a record.",
                syntax: "<STRING: MODEL NAME> <INT: RECORD ID or LIST OF IDs>",
                args: "sli",
                example: "res.partner 10,4,2",
            });
            this.registerCommand("write", {
                definition: "Update record values",
                callback: this._cmdWriteModelRecord,
                detail: "Update record values.",
                syntax:
                    "<STRING: MODEL NAME> <INT: RECORD ID or LIST OF IDs> " +
                    '"<DICT: NEW VALUES>"',
                args: "slij",
                example: "res.partner 10,4,2 \"{'street': 'Diagon Alley'}\"",
            });
            this.registerCommand("search", {
                definition: "Search model record/s",
                callback: this._cmdSearchModelRecord,
                detail:
                    "Launch orm search query.<br>[FIELDS] " +
                    "are separated by commas (without spaces) and by default " +
                    "is 'display_name'. Can use '*' to show all fields of the model" +
                    "<br>[LIMIT] can be zero (no limit)" +
                    "<br>[ORDER] A list of orders separated by comma (Example: 'age DESC, email')",
                syntax:
                    "<STRING: MODEL NAME> [STRING: FIELDS] " +
                    '"[ARRAY: DOMAIN]" [INT: LIMIT] [INT: OFFSET] ' +
                    '"[STRING: ORDER]"',
                args: "s?lsjiis",
                example: "res.partner * [] 100 5 'id DESC, name'",
            });
            this.registerCommand("call", {
                definition: "Call model method",
                callback: this._cmdCallModelMethod,
                detail: "Call model method. Remember: Methods with @api.model decorator doesn't need the id.",
                syntax:
                    '<STRING: MODEL> <STRING: METHOD> "[ARRAY: ARGS]" ' +
                    '"[DICT: KWARGS]"',
                args: "ss?jj",
                example: "res.partner can_edit_vat [8]",
            });
            this.registerCommand("upgrade", {
                definition: "Upgrade a module",
                callback: this._cmdUpgradeModule,
                detail: "Launch upgrade module process.",
                syntax: "<STRING: MODULE NAME>",
                args: "s",
                example: "contacts",
            });
            this.registerCommand("install", {
                definition: "Install a module",
                callback: this._cmdInstallModule,
                detail: "Launch module installation process.",
                syntax: "<STRING: MODULE NAME>",
                args: "s",
                example: "contacts",
            });
            this.registerCommand("uninstall", {
                definition: "Uninstall a module",
                callback: this._cmdUninstallModule,
                detail: "Launch module deletion process.",
                syntax: "<STRING: MODULE NAME>",
                args: "s",
                exmaple: "contacts",
            });
            this.registerCommand("reload", {
                definition: "Reload current page",
                callback: this._cmdReloadPage,
                detail: "Reload current page.",
                syntax: "",
                args: "",
            });
            this.registerCommand("debug", {
                definition: "Set debug mode",
                callback: this._cmdSetDebugMode,
                detail:
                    "Set debug mode:<br>- 0: Disabled<br>- 1: " +
                    "Enabled<br>- 2: Enabled with Assets",
                syntax: "<INT: MODE>",
                args: "i",
                example: "2",
            });
            this.registerCommand("action", {
                definition: "Call action",
                callback: this._cmdCallAction,
                detail:
                    "Call action.<br>&lt;ACTION&gt; Can be an " +
                    "string, number or object.",
                syntax: '"<STRING|DICT: ACTION>"',
                args: "*",
                example: "134",
            });
            this.registerCommand("post", {
                definition: "Send POST request",
                callback: this._cmdPostData,
                detail: "Send POST request to selected endpoint",
                syntax: '<STRING: ENDPOINT> "<DICT: DATA>"',
                args: "sj",
                example: "/web/endpoint \"{'the_example': 42}\"",
            });
            this.registerCommand("whoami", {
                definition: "Know current user login",
                callback: this._cmdShowWhoAmI,
                detail: "Shows current user login",
                syntax: "",
                args: "",
            });
            this.registerCommand("caf", {
                definition: "Check model fields access",
                callback: this._cmdCheckFieldAccess,
                detail: "Show readable/writeable fields of the selected model",
                syntax: '<STRING: MODEL> "[LIST: FIELDS]"',
                args: "s?ls",
                example: 'res.partner "name,street"',
            });
            this.registerCommand("cam", {
                definition: "Check model access",
                callback: this._cmdCheckModelAccess,
                detail:
                    "Show access rights for the selected operation on the" +
                    " selected model" +
                    "<br>&lt;OPERATION&gt; Can be 'create', 'read', 'write'" +
                    " or 'unlink'",
                syntax: "<STRING: MODEL> <STRING: OPERATION>",
                args: "ss",
                example: "res.partner read",
            });
            this.registerCommand("lastseen", {
                definition: "Know user presence",
                callback: this._cmdLastSeen,
                detail: "Show users last seen",
                syntax: "",
                args: "",
            });
            this.registerCommand("read", {
                definition: "Search model record",
                callback: this._cmdSearchModelRecordId,
                detail:
                    "Launch orm search query.<br>[FIELDS] " +
                    "are separated by commas (without spaces) and by default " +
                    "is 'display_name'. Can use '*' to show all fields.",
                syntax:
                    "<STRING: MODEL NAME> <INT: RECORD ID or LIST OF IDs> " +
                    "[STRING: FIELDS]",
                args: "sli?ls",
                example: "res.partner 10,4,2 name,street",
            });
            this.registerCommand("context", {
                definition: "Operations over session context dictionary",
                callback: this._cmdContextOperation,
                detail:
                    "Operations over session context dictionary." +
                    "<br>[OPERATION] can be 'read', 'write' or 'set'. " +
                    "By default is 'read'. ",
                syntax: '[STRING: OPERATION] "[DICT: VALUES]" ',
                args: "?sj",
                example: "write \"{'the_example': 1}\"",
            });
            this.registerCommand("version", {
                definition: "Know Odoo version",
                callback: this._cmdShowOdooVersion,
                detail: "Shows Odoo version",
                syntax: "",
                args: "",
            });
            this.registerCommand("longpolling", {
                definition: "Long-Polling operations",
                callback: this._cmdLongpolling,
                detail:
                    "Operations over long-polling." +
                    "<br>[OPERATION] can be 'verbose', 'off', 'add_channel'," +
                    " 'del_channel', 'start', 'stop' or empty. " +
                    "If empty, prints current value." +
                    "<br> - verbose > Print incoming notificacions" +
                    "<br> - off > Stop verbose mode" +
                    "<br> - add_channel > Add a channel to listen" +
                    "<br> - del_channel > Delete a listening channel" +
                    "<br> - start > Start client longpolling service" +
                    "<br> - stop > Stop client longpolling service",
                syntax: "[STRING: OPERATION] [STRING: PARAM1]",
                args: "?ss",
                example: "add_channel example_channel",
            });
            this.registerCommand("login", {
                definition: "Login as...",
                callback: this._cmdLoginAs,
                detail:
                    "Login as selected user." +
                    "<br>&lt;DATABASE&gt; Can be '*' to use current database" +
                    "<br>&lt;LOGIN&gt; Can be optionally preceded by the '-'" +
                    " character and it will be used for password too",
                syntax: "<STRING: DATABASE> <STRING: LOGIN> [STRING: PASSWORD]",
                args: "ss?s",
                secured: true,
                example: "devel -admin",
            });
            this.registerCommand("uhg", {
                definition: "Check if user is in the selected groups",
                callback: this._cmdUserHasGroups,
                detail:
                    "Check if user is in the selected groups." +
                    "<br>&lt;GROUPS&gt; A list of groups separated by " +
                    "commas, a group can be optionally preceded by '!' to " +
                    "say 'is not in group'",
                syntax: "<STRING: GROUPS>",
                args: "s",
                example: "base.group_user",
            });
            this.registerCommand("dblist", {
                definition: "Show database names",
                callback: this._cmdShowDBList,
                detail: "Show database names",
                syntax: "",
                args: "",
            });
            this.registerCommand("jstest", {
                definition: "Launch JS Tests",
                callback: this._cmdJSTest,
                detail:
                    "Runs js tests in desktop or mobile mode for the selected module." +
                    "<br>&lt;MODULE&gt; Module technical name" +
                    "<br>&lt;MODE&gt; Can be 'desktop' or 'mobile' (By default is 'desktop')",
                syntax: "<STRING: MODULE> <STRING: MODE>",
                args: "?ss",
                example: "web mobile",
            });
            this.registerCommand("tour", {
                definition: "Launch Tour",
                callback: this._cmdRunTour,
                detail:
                    "Runs the selected tour. If no tour given, prints all available tours." +
                    "<br>[TOUR NAME] Tour Name",
                syntax: "[STRING: TOUR NAME]",
                args: "?s",
                example: "mail_tour",
            });
            this.registerCommand("json", {
                definition: "Send POST JSON",
                callback: this._cmdPostJSONData,
                detail: "Sends HTTP POST 'application/json' request",
                syntax: '<STRING: ENDPOINT> "<DICT: DATA>"',
                args: "sj",
                example: "/web/endpoint \"{'the_example': 42}\"",
            });
            this.registerCommand("depends", {
                definition: "Know modules that depends on the given module",
                callback: this._cmdModuleDepends,
                detail: "Show a list of the modules that depends on the given module",
                syntax: "<STRING: MODULE NAME>",
                args: "s",
                example: "base",
            });
            this.registerCommand("ual", {
                definition: "Update apps list",
                callback: this._cmdUpdateAppList,
                detail: "Update apps list",
                syntax: "",
                args: "",
            });
            this.registerCommand("logout", {
                definition: "Log out",
                callback: this._cmdLogOut,
                detail: "Session log out",
                syntax: "",
                args: "",
            });
            this.registerCommand("count", {
                definition:
                    "Gets number of records from the given model in the selected domain",
                callback: this._cmdCount,
                detail: "Gets number of records from the given model in the selected domain",
                syntax: '<STRING: MODEL> "[ARRAY: DOMAIN]"',
                args: "s?j",
                example: "res.partner ['name', '=ilike', 'A%']",
            });
            this.registerCommand("ref", {
                definition:
                    "Show the referenced model and id of the given xmlid's",
                callback: this._cmdRef,
                detail: "Show the referenced model and id of the given xmlid's",
                syntax: "<LIST: STRING XML ID>",
                args: "ls",
                example: "base.main_company,base.model_res_partner",
            });
            this.registerCommand("pot", {
                definition: "Operations over translations",
                callback: this._cmdPot,
                detail:
                    "Operations over translations." +
                    "<br>[OPERATION] can be 'export', 'import', 'languages'." +
                    "<br>[FORMAT] vanilla formats are 'po' and 'csv'. (Default is 'po')",
                syntax: "<STRING: OPERATION> [STRING: LANGUAGE] [LIST: TECHNICAL MODEL NAMES] [STRING: FORMAT] [INT: OVERWRITE]",
                args: "s?slsi",
                example: "export en_US discuss",
            });
        },

        _cmdPot: function (
            operation,
            lang = false,
            module_names = [],
            format = "po",
            overwrite = true
        ) {
            return new Promise(async (resolve, reject) => {
                try {
                    if (operation === "export") {
                        if (lang && _.isEmpty(module_names)) {
                            return reject("Need the technical module name(s)");
                        } else if (!lang && _.isEmpty(module_names)) {
                            return this.do_action(
                                "base.action_wizard_lang_export"
                            );
                        }
                        // Get module ids
                        let module_ids = await rpc.query({
                            method: "search_read",
                            domain: [["name", "in", module_names]],
                            fields: ["id"],
                            model: "ir.module.module",
                            kwargs: {context: this._getContext()},
                        });
                        module_ids = _.map(module_ids, "id");
                        if (_.isEmpty(module_ids)) {
                            return reject("No modules found!");
                        }
                        // Create wizard record
                        const wizard_id = await rpc.query({
                            method: "create",
                            model: "base.language.export",
                            args: [
                                {
                                    state: "choose",
                                    format: format,
                                    lang: lang,
                                    modules: [[6, false, module_ids]],
                                },
                            ],
                            kwargs: {context: this._getContext()},
                        });
                        if (!wizard_id) {
                            return reject("Can't create wizard record!");
                        }

                        // Get action to export
                        const action = await rpc.query({
                            method: "act_getfile",
                            model: "base.language.export",
                            args: [[wizard_id]],
                            kwargs: {context: this._getContext()},
                        });

                        // Get updated wizard record data
                        const wizard_record = await rpc.query({
                            method: "search_read",
                            domain: [["id", "=", wizard_id]],
                            fields: false,
                            model: "base.language.export",
                            kwargs: {context: this._getContext()},
                        });

                        // Get file
                        await Utils.getContent(
                            {
                                model: "base.language.export",
                                id: wizard_id,
                                field: "data",
                                filename_field: "name",
                                filename: wizard_record.name || "",
                            },
                            this.printError
                        );

                        return resolve(action);
                    }
                    if (operation === "import") {
                        if (!lang && _.isEmpty(module_names)) {
                            return this.do_action(
                                "base.action_wizard_lang_import"
                            );
                        }
                        // Get file content
                        const file64 = await Utils.file2Base64();
                        // Create wizard record
                        const wizard_id = await rpc.query({
                            method: "create",
                            model: "base.language.import",
                            args: [
                                {
                                    name: "CHANGE ME!",
                                    code: lang,
                                    filename: `${lang}.${format}`,
                                    overwrite: overwrite,
                                    data: file64,
                                },
                            ],
                            kwargs: {context: this._getContext()},
                        });
                        if (!wizard_id) {
                            return reject("Can't create wizard record!");
                        }

                        // Get action to export
                        const status = await rpc.query({
                            method: "import_lang",
                            model: "base.language.import",
                            args: [[wizard_id]],
                            kwargs: {context: this._getContext()},
                        });
                        if (status) {
                            this.screen.print(
                                "Language file imported successfully"
                            );
                        }
                        return resolve(status);
                    } else if (operation === "languages") {
                        const langs = await rpc.query({
                            method: "get_installed",
                            model: "res.lang",
                            kwargs: {context: this._getContext()},
                        });
                        for (lang of langs) {
                            this.screen.print(` - ${lang[0]} (${lang[1]})`);
                        }
                        return resolve(langs);
                    }
                    return reject("Invalid operation!");
                } catch (err) {
                    return reject(err);
                }
            });
        },

        _cmdRef: function (xmlids) {
            const tasks = [];
            for (const xmlid of xmlids) {
                tasks.push(
                    rpc
                        .query({
                            method: "xmlid_to_res_model_res_id",
                            model: "ir.model.data",
                            args: [xmlid],
                            kwargs: {context: this._getContext()},
                        })
                        .then(
                            function (active_xmlid, result) {
                                return [active_xmlid, result[0], result[1]];
                            }.bind(this, xmlid)
                        )
                );
            }

            return Promise.all(tasks).then((results) => {
                let body = "";
                const len = results.length;
                for (let x = 0; x < len; ++x) {
                    const item = results[x];
                    body +=
                        `<tr><td>${item[0]}</td>` +
                        `<td>${item[1]}</td>` +
                        `<td>${item[2]}</td></tr>`;
                }
                this.screen.printTable(
                    ["XML ID", "Res. Model", "Res. ID"],
                    body
                );
                return results;
            });
        },

        _cmdCount: function (model, domain = []) {
            return rpc
                .query({
                    method: "search_count",
                    model: model,
                    args: [domain],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(`Result: ${result}`);
                    return result;
                });
        },

        _cmdUpdateAppList: function () {
            return rpc
                .query({
                    method: "update_list",
                    model: "ir.module.module",
                })
                .then((result) => {
                    if (result) {
                        this.screen.print(
                            "The apps list has been updated successfully"
                        );
                    } else {
                        this.screen.printError("Can't update the apps list!");
                    }
                    return result;
                });
        },

        _cmdModuleDepends: function (module_name) {
            return rpc
                .query({
                    method: "onchange_module",
                    model: "res.config.settings",
                    args: [false, false, module_name],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    if (_.isEmpty(result)) {
                        this.screen.printError("The module isn't installed");
                    } else {
                        const depend_names = result.warning.message
                            .substr(result.warning.message.search("\n") + 1)
                            .split("\n");
                        this.screen.print(depend_names);
                    }
                    return result;
                });
        },

        _cmdPostJSONData: function (url, data) {
            return rpc
                .query({
                    route: url,
                    params: data,
                })
                .then((result) => {
                    this.screen.print(result);
                    return result;
                });
        },

        _cmdRunTour: function (tour_name) {
            const tour_names = Object.keys(tour.tours);
            if (tour_name) {
                if (tour_names.indexOf(tour_name) === -1) {
                    this.screen.printError("The given tour doesn't exists!");
                } else {
                    odoo.__DEBUG__.services["web_tour.tour"].run(tour_name);
                    this.screen.print("Running tour...");
                }
            } else if (tour_names.length) {
                this.screen.print(tour_names);
            } else {
                this.screen.print("The tour list is empty");
            }
            return Promise.resolve();
        },

        _cmdJSTest: function (module_name, mode) {
            let mod = module_name || "";
            if (module_name === "*") {
                mod = "";
            }
            let url = `/web/tests?module=${mod}`;
            if (mode === "mobile") {
                url = `/web/tests/mobile?module=${mod}`;
            }
            window.location = url;
            return Promise.resolve();
        },

        _cmdShowDBList: function () {
            return ajax
                .rpc("/jsonrpc", {
                    service: "db",
                    method: "list",
                    args: {},
                })
                .then((databases) => {
                    const databases_len = databases.length;
                    if (!databases_len) {
                        this.screen.printError("Can't get database names");
                        return;
                    }
                    // Search active database
                    let index = 0;
                    while (index < databases_len) {
                        const database = databases[index];
                        if (database === session.db) {
                            databases[
                                index
                            ] = `<strong>${database}</strong> (Active Database)`;
                            break;
                        }
                        ++index;
                    }
                    this.screen.print(databases);
                    return databases;
                });
        },

        _cmdUserHasGroups: function (groups) {
            return rpc
                .query({
                    method: "user_has_groups",
                    model: "res.users",
                    args: [groups],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(result);
                    return result;
                });
        },

        _cmdLoginAs: function (database, login_name, pass) {
            let db = database;
            let login = login_name;
            let passwd = pass || false;
            if (login[0] === "-" && !passwd) {
                login = login.substr(1);
                passwd = login;
            }
            if (db === "*") {
                if (!session.db) {
                    this.screen.printError(
                        "Unknown active database. Try using " +
                            "'<span class='o_terminal_click o_terminal_cmd' " +
                            "data-cmd='dblist'>dblist</span>' command."
                    );
                    return Promise.resolve();
                }
                db = session.db;
            }
            return session
                ._session_authenticate(db, login, passwd)
                .then((result) => {
                    this.screen.print(`Successfully logged as '${login}'`);
                    return result;
                });
        },

        _cmdLogOut: function () {
            return session.session_logout().then((result) => {
                this.screen.print("Logged out");
                return result;
            });
        },

        _longPollingAddChannel: function (name) {
            if (typeof name === "undefined") {
                this.screen.printError("Invalid channel name.");
            } else {
                this.screen.print(this._longpolling.addChannel(name));
                this.screen.print(`Joined the '${name}' channel.`);
            }
        },

        _longPollingDelChannel: function (name) {
            if (typeof name === "undefined") {
                this.screen.printError("Invalid channel name.");
            } else {
                this._longpolling.deleteChannel(name);
                this.screen.print(`Leave the '${name}' channel.`);
            }
        },

        _cmdLongpolling: function (operation, name) {
            if (!this._longpolling) {
                return Promise.reject(
                    "Can't use longpolling, 'bus' module is not installed"
                );
            }

            if (typeof operation === "undefined") {
                this.screen.print(this._longpolling.isVerbose() || "off");
            } else if (operation === "verbose") {
                this._longpolling.setVerbose(true);
                this.screen.print("Now long-polling is in verbose mode.");
            } else if (operation === "off") {
                this._longpolling.setVerbose(false);
                this.screen.print("Now long-polling verbose mode is disabled");
            } else if (operation === "add_channel") {
                this._longPollingAddChannel(name);
            } else if (operation === "del_channel") {
                this._longPollingDelChannel(name);
            } else if (operation === "start") {
                this._longpolling.startPoll();
                this.screen.print("Longpolling started");
            } else if (operation === "stop") {
                this._longpolling.stopPoll();
                this.screen.print("Longpolling stopped");
            } else {
                this.screen.printError("Invalid Operation.");
            }
            return Promise.resolve();
        },

        _cmdShowOdooVersion: function () {
            try {
                this.screen.print(
                    `${odoo.session_info.server_version_info
                        .slice(0, 3)
                        .join(".")} (${odoo.session_info.server_version_info
                        .slice(3)
                        .join(" ")})`
                );
            } catch (err) {
                this.screen.print(window.term_odooVersionRaw);
            }
            return Promise.resolve();
        },

        _cmdContextOperation: function (operation = "read", values = false) {
            if (operation === "read") {
                this.screen.print(session.user_context);
            } else if (operation === "set") {
                session.user_context = values;
                this.screen.print(session.user_context);
            } else if (operation === "write") {
                Object.assign(session.user_context, values);
                this.screen.print(session.user_context);
            } else if (operation === "delete") {
                if (values in session.user_context) {
                    delete session.user_context[values];
                    this.screen.print(session.user_context);
                } else {
                    this.screen.printError(
                        "The selected key is not present in the terminal context"
                    );
                }
            } else {
                this.screen.printError("Invalid operation");
            }
            return Promise.resolve();
        },

        _cmdSearchModelRecordId: function (model, id, field_names) {
            let fields = ["display_name"];
            if (field_names) {
                fields = field_names === "*" ? false : field_names;
            }
            return rpc
                .query({
                    method: "search_read",
                    domain: [["id", "in", id]],
                    fields: fields,
                    model: model,
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.printRecords(model, result);
                    return result;
                });
        },

        _cmdLastSeen: function () {
            if (!this._longpolling) {
                return Promise.reject(
                    "Can't use lastseen, 'bus' module is not installed"
                );
            }
            return rpc
                .query({
                    method: "search_read",
                    fields: ["user_id", "last_presence"],
                    model: "bus.presence",
                    orderBy: [{name: "last_presence", asc: false}],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    let body = "";
                    const len = result.length;
                    for (let x = 0; x < len; ++x) {
                        const record = result[x];
                        body +=
                            `<tr><td>${record.user_id[1]}</td>` +
                            `<td>${record.user_id[0]}</td>` +
                            `<td>${record.last_presence}</td></tr>`;
                    }
                    this.screen.printTable(
                        ["User Name", "User ID", "Last Seen"],
                        body
                    );
                    return result;
                });
        },

        _cmdCheckModelAccess: function (model, operation) {
            return rpc
                .query({
                    method: "check_access_rights",
                    model: model,
                    args: [operation, false],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    if (result) {
                        this.screen.print(
                            `You have access rights for '${operation}' on ${model}`
                        );
                    } else {
                        this.screen.print(
                            `You can't '${operation}' on ${model}`
                        );
                    }
                    return result;
                });
        },

        _cmdCheckFieldAccess: function (model, field_names = false) {
            let fields = false;
            if (field_names) {
                fields = field_names === "*" ? false : field_names;
            }
            return rpc
                .query({
                    method: "fields_get",
                    model: model,
                    args: [fields],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    const keys = Object.keys(result).sort();
                    const fieldParams = [
                        "type",
                        "string",
                        "relation",
                        "required",
                        "readonly",
                        "searchable",
                        "translate",
                        "depends",
                    ];
                    let body = "";
                    const len = keys.length;
                    for (let x = 0; x < len; ++x) {
                        const field = keys[x];
                        const fieldDef = result[field];
                        body += "<tr>";
                        if (fieldDef.required) {
                            body += `<td>* <b style='color:mediumslateblue'>${field}</b></td>`;
                        } else {
                            body += `<td>${field}</td>`;
                        }
                        const l2 = fieldParams.length;
                        for (let x2 = 0; x2 < l2; ++x2) {
                            let value = fieldDef[fieldParams[x2]];
                            if (_.isUndefined(value) || _.isNull(undefined)) {
                                value = "";
                            }
                            body += `<td>${value}</td>`;
                        }
                        body += "</tr>";
                    }
                    fieldParams.unshift("field");
                    this.screen.printTable(fieldParams, body);
                    return result;
                });
        },

        _cmdShowWhoAmI: function () {
            return rpc
                .query({
                    method: "search_read",
                    domain: [["id", "=", Utils.getUID()]],
                    fields: [
                        "id",
                        "display_name",
                        "login",
                        "partner_id",
                        "company_id",
                        "company_ids",
                        "groups_id",
                    ],
                    model: "res.users",
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    if (result.length) {
                        const record = result[0];
                        this.screen.print(
                            this._templates.render("WHOAMI", {
                                login: record.login,
                                display_name: record.display_name,
                                user_id: record.id,
                                partner: record.partner_id,
                                company: record.company_id,
                                companies: record.company_ids,
                                groups: record.groups_id,
                            })
                        );
                    } else {
                        this.screen.printError("Oops! can't get the login :/");
                    }
                    return result;
                });
        },

        _cmdSetDebugMode: function (mode) {
            if (mode === 0) {
                this.screen.print(
                    "Debug mode <strong>disabled</strong>. Reloading page..."
                );
                const qs = $.deparam.querystring();
                delete qs.debug;
                window.location.search = "?" + $.param(qs);
            } else if (mode === 1) {
                this.screen.print(
                    "Debug mode <strong>enabled</strong>. Reloading page..."
                );
                window.location = $.param.querystring(
                    window.location.href,
                    "debug=1"
                );
            } else if (mode === 2) {
                this.screen.print(
                    "Debug mode with assets <strong>enabled</strong>. " +
                        "Reloading page..."
                );
                window.location = $.param.querystring(
                    window.location.href,
                    "debug=assets"
                );
            } else {
                this.screen.printError("Invalid debug mode");
            }
            return Promise.resolve();
        },

        _cmdReloadPage: function () {
            location.reload();
            return Promise.resolve();
        },

        _searchModule: function (module_name) {
            return rpc.query({
                method: "search_read",
                domain: [["name", "=", module_name]],
                fields: ["name"],
                model: "ir.module.module",
                kwargs: {context: this._getContext()},
            });
        },

        _cmdUpgradeModule: function (module_name) {
            return this._searchModule(module_name).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_upgrade",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            this.screen.print(
                                `'${module_name}' module successfully upgraded`
                            );
                        },
                        () => {
                            this.screen.printError(
                                `Can't upgrade '${module_name}' module`
                            );
                        }
                    );
                } else {
                    this.screen.printError(
                        `'${module_name}' module doesn't exists`
                    );
                }
            });
        },

        _cmdInstallModule: function (module_name) {
            return this._searchModule(module_name).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_install",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            this.screen.print(
                                `'${module_name}' module successfully installed`
                            );
                        },
                        () => {
                            this.screen.printError(
                                `Can't install '${module_name}' module`
                            );
                        }
                    );
                } else {
                    this.screen.printError(
                        `'${module_name}' module doesn't exists`
                    );
                }
            });
        },

        _cmdUninstallModule: function (module_name) {
            return this._searchModule(module_name).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_uninstall",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            this.screen.print(
                                `'${module_name}' module successfully uninstalled`
                            );
                        },
                        () => {
                            this.screen.printError(
                                `Can't uninstall '${module_name}' module`
                            );
                        }
                    );
                } else {
                    this.screen.printError(
                        `'${module_name}' module doesn't exists`
                    );
                }
            });
        },

        _cmdCallModelMethod: function (model, method, args = [], kwargs = {}) {
            const pkwargs = kwargs;
            if (typeof pkwargs.context === "undefined") {
                pkwargs.context = this._getContext();
            }
            return rpc
                .query({
                    method: method,
                    model: model,
                    args: args,
                    kwargs: pkwargs,
                })
                .then((result) => {
                    this.screen.print(result);
                    return result;
                });
        },

        /**
         * Odoo js framework works with a custom object for sort. This
         * method converts string to this object.
         *
         * @param {String} orderBy
         * @returns {Array}
         */
        _deserializeSort: function (orderBy) {
            const res = [];
            if (!orderBy) {
                return res;
            }
            const orders = this._parameterReader.splitAndTrim(orderBy, ",");
            const orders_len = orders.length;
            let index = 0;
            while (index < orders_len) {
                const order_s = orders[index].split(" ");
                res.push({
                    name: order_s[0],
                    asc:
                        order_s.length < 2 ||
                        order_s[1].toLowerCase() === "asc",
                });
                ++index;
            }
            return res;
        },

        _cmdSearchModelRecord: function (
            model,
            field_names,
            domain = [],
            limit,
            offset,
            order
        ) {
            const lines_total = this.screen._max_lines - 3;
            let fields = ["display_name"];
            if (field_names) {
                fields = field_names === "*" ? false : field_names;
            }

            // Workaround: '--more' is a special model name to handle print the rest of the previous call result
            if (model === "--more") {
                const buff = this._buffer[this.__meta.name];
                if (!buff || !buff.data.length) {
                    this.screen.printError(
                        "There are no more results to print"
                    );
                    return Promise.resolve();
                }
                const sresult = buff.data.slice(0, lines_total);
                buff.data = buff.data.slice(lines_total);
                this.screen.printRecords(buff.model, sresult);
                if (buff.data.length) {
                    this.screen.print(
                        `There are still results to print (${buff.data.length}). Continue using '<strong class='o_terminal_click o_terminal_cmd' data-cmd='search --more'>--more</strong>'...`
                    );
                }
                this.screen.print(`Records count: ${sresult.length}`);
                return Promise.resolve(sresult);
            }

            return rpc
                .query({
                    method: "search_read",
                    domain: domain,
                    fields: fields,
                    model: model,
                    limit: limit,
                    offset: offset,
                    orderBy: this._deserializeSort(order),
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    const need_truncate = result.length > lines_total;
                    let sresult = result;
                    if (need_truncate) {
                        this._buffer[this.__meta.name] = {
                            model: model,
                            data: sresult.slice(lines_total),
                        };
                        sresult = sresult.slice(0, lines_total);
                    }
                    this.screen.printRecords(model, sresult);
                    if (need_truncate) {
                        this.screen.printError(
                            `<strong class='text-warning'>Result truncated!</strong> The query is too big to be displayed entirely. Use '<strong class='o_terminal_click o_terminal_cmd' data-cmd='search --more'>search --more</strong>' to print the rest of the results (${
                                this._buffer[this.__meta.name].data.length
                            })...`
                        );
                    }
                    this.screen.print(`Records count: ${sresult.length}`);
                    return result;
                });
        },

        _cmdCreateModelRecord: function (model, values) {
            if (typeof values === "undefined") {
                return this.do_action({
                    type: "ir.actions.act_window",
                    res_model: model,
                    views: [[false, "form"]],
                    target: "current",
                }).then(() => {
                    this.doHide();
                });
            }
            return rpc
                .query({
                    method: "create",
                    model: model,
                    args: [values],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(
                        this._templates.render("RECORD_CREATED", {
                            model: model,
                            new_id: result,
                        })
                    );
                    return result;
                });
        },

        _cmdUnlinkModelRecord: function (model, id) {
            return rpc
                .query({
                    method: "unlink",
                    model: model,
                    args: [id],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(`${model} record deleted successfully`);
                    return result;
                });
        },

        _cmdWriteModelRecord: function (model, id, values) {
            return rpc
                .query({
                    method: "write",
                    model: model,
                    args: [id, values],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(`${model} record updated successfully`);
                    return result;
                });
        },

        _cmdCallAction: function (action) {
            let saction = action;
            if (this._parameterReader._validateJson(action)) {
                saction = this._parameterReader._formatJson(action);
            }
            return this.do_action(saction);
        },

        _cmdPostData: function (url, data) {
            return ajax.post(url, data).then((result) => {
                this.screen.print(result);
            });
        },

        //
        _onBusNotification: function (notifications) {
            const NotifDatas = Object.values(notifications.data);
            const l = NotifDatas.length;
            for (let x = 0; x < l; ++x) {
                const notif = NotifDatas[x];
                this.screen.print(
                    "<strong>[<i class='fa fa-envelope-o'></i>] New Longpolling Notification:</stron>"
                );
                if (notif[0] !== "not") {
                    this.screen.print(
                        [
                            `From: ${notif[0][0]}`,
                            `Channel: ${notif[0][1]}`,
                            `To: ${notif[0][2]}`,
                        ],
                        true
                    );
                }
                this.screen.print(notif[1], false);
            }
        },
    });
});
