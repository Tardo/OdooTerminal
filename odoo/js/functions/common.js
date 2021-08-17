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
                args: [
                    "s::m:model::1::The model technical name",
                    "j::v:value::0::The values to write",
                ],
                example: "-m res.partner -v \"{'name': 'Poldoore'}\"",
            });
            this.registerCommand("unlink", {
                definition: "Unlink record",
                callback: this._cmdUnlinkModelRecord,
                detail: "Delete a record.",
                args: [
                    "s::m:model::1::The model technical name",
                    "li::i:id::1::The record id's",
                ],
                example: "-m res.partner -i 10,4,2",
            });
            this.registerCommand("write", {
                definition: "Update record values",
                callback: this._cmdWriteModelRecord,
                detail: "Update record values.",
                args: [
                    "s::m:model::1::The model technical name",
                    "li::i:id::1::The record id's",
                    "j::v:value::1::The values to write",
                ],
                example:
                    "-m res.partner -i 10,4,2 -v \"{'street': 'Diagon Alley'}\"",
            });
            this.registerCommand("search", {
                definition: "Search model record/s",
                callback: this._cmdSearchModelRecord,
                detail: "Launch orm search query",
                args: [
                    "s::m:model::1::The model technical name",
                    "ls::f:field::0::The field names to request<br/>Can use '*' to show all fields of the model::display_name",
                    "j::d:domain::0::The domain::[]",
                    "i::l:limit::0::The limit of records to request",
                    "i::of:offset::0::The offset (from)<br/>Can be zero (no limit)",
                    "s::o:order::0::The order<br/>A list of orders separated by comma (Example: 'age DESC, email')",
                    "f::more:more::0::Flag to indicate that show more results",
                ],
                example: "-m res.partner -f * -l 100 -of 5 -o 'id DESC, name'",
            });
            this.registerCommand("call", {
                definition: "Call model method",
                callback: this._cmdCallModelMethod,
                detail: "Call model method. Remember: Methods with @api.model decorator doesn't need the id.",
                args: [
                    "s::m:model::1::The model technical name",
                    "s::c:call::1::The method name to call",
                    "j::a:argument::0::The arguments list::[]",
                    "j::k:kwarg::0::The arguments dictionary::{}",
                ],
                example: "-m res.partner -c can_edit_vat -a [8]",
            });
            this.registerCommand("upgrade", {
                definition: "Upgrade a module",
                callback: this._cmdUpgradeModule,
                detail: "Launch upgrade module process.",
                args: ["s::m:module::1::The module technical name"],
                example: "-m contacts",
            });
            this.registerCommand("install", {
                definition: "Install a module",
                callback: this._cmdInstallModule,
                detail: "Launch module installation process.",
                args: ["s::m:module::1::The module technical name"],
                example: "-m contacts",
            });
            this.registerCommand("uninstall", {
                definition: "Uninstall a module",
                callback: this._cmdUninstallModule,
                detail: "Launch module deletion process.",
                args: ["s::m:module::1::The module technical name"],
                exmaple: "-m contacts",
            });
            this.registerCommand("reload", {
                definition: "Reload current page",
                callback: this._cmdReloadPage,
                detail: "Reload current page.",
            });
            this.registerCommand("debug", {
                definition: "Set debug mode",
                callback: this._cmdSetDebugMode,
                detail: "Set debug mode",
                args: [
                    "i::m:mode::1::The mode<br>- 0: Disabled<br>- 1: Enabled<br>- 2: Enabled with Assets::::0:1:2",
                ],
                example: "-m 2",
            });
            this.registerCommand("action", {
                definition: "Call action",
                callback: this._cmdCallAction,
                detail: "Call action",
                args: [
                    "-::a:action::1::The action to launch<br/>Can be an string, number or object",
                ],
                example: "-a 134",
            });
            this.registerCommand("post", {
                definition: "Send POST request",
                callback: this._cmdPostData,
                detail: "Send POST request to selected endpoint",
                args: [
                    "s::e:endpoint::1::The endpoint",
                    "j::d:data::1::The data",
                ],
                example: "-e /web/endpoint -d \"{'the_example': 42}\"",
            });
            this.registerCommand("whoami", {
                definition: "Know current user login",
                callback: this._cmdShowWhoAmI,
                detail: "Shows current user login",
            });
            this.registerCommand("caf", {
                definition: "Check model fields access",
                callback: this._cmdCheckFieldAccess,
                detail: "Show readable/writeable fields of the selected model",
                args: [
                    "s::m:model::1::The model technical name",
                    "ls::f:field::0::The field names to request::*",
                    "j::fi:filter::0::The filter to apply",
                ],
                example: "-m res.partner -f name,street",
            });
            this.registerCommand("cam", {
                definition: "Check model access",
                callback: this._cmdCheckModelAccess,
                detail:
                    "Show access rights for the selected operation on the" +
                    " selected model",
                args: [
                    "s::m:model::1::The model technical name",
                    "s::o:operation::1::The operation to do::::create:read:write:unlink",
                ],
                example: "-m res.partner -o read",
            });
            this.registerCommand("lastseen", {
                definition: "Know user presence",
                callback: this._cmdLastSeen,
                detail: "Show users last seen",
            });
            this.registerCommand("read", {
                definition: "Search model record",
                callback: this._cmdSearchModelRecordId,
                detail: "Launch orm search query.",
                args: [
                    "s::m:model::1::The model technical name",
                    "li::i:id::1::The record id's",
                    "ls::f:field::0::The fields to request<br/>Can use '*' to show all fields::display_name",
                ],
                example: "-m res.partner -i 10,4,2 -f name,street",
            });
            this.registerCommand("context", {
                definition: "Operations over session context dictionary",
                callback: this._cmdContextOperation,
                detail: "Operations over session context dictionary.",
                args: [
                    "s::o:operation::0::The operation to do::read::read:write:set",
                    "j::v:value::0::The values",
                ],
                example: "-o write -v \"{'the_example': 1}\"",
            });
            this.registerCommand("version", {
                definition: "Know Odoo version",
                callback: this._cmdShowOdooVersion,
                detail: "Shows Odoo version",
            });
            this.registerCommand("longpolling", {
                definition: "Long-Polling operations",
                callback: this._cmdLongpolling,
                detail: "Operations over long-polling.",
                args: [
                    "s::o:operation::0::The operation to do<br>- verbose > Print incoming notificacions<br>- off > Stop verbose mode<br>- add_channel > Add a channel to listen<br>- del_channel > Delete a listening channel<br>- start > Start client longpolling service<br> - stop > Stop client longpolling service::::verbose:off:add_channel:del_channel:start:stop",
                    "s::p:param::0::The parameter",
                ],
                example: "add_channel example_channel",
            });
            this.registerCommand("login", {
                definition: "Login as...",
                callback: this._cmdLoginAs,
                detail: "Login as selected user.",
                args: [
                    "s::d:database::1::The database<br/>Can be '*' to use current database",
                    "s::u:user::1::The login<br/>Can be optionally preceded by the '#' character and it will be used for password too",
                    "s::p:password::0::The password",
                ],
                secured: true,
                example: "-d devel -u #admin",
            });
            this.registerCommand("uhg", {
                definition: "Check if user is in the selected groups",
                callback: this._cmdUserHasGroups,
                detail: "Check if user is in the selected groups.",
                args: [
                    "ls::g:group::1::The technical name of the group<br/>A group can be optionally preceded by '!' to say 'is not in group'",
                ],
                example: "-g base.group_user",
            });
            this.registerCommand("dblist", {
                definition: "Show database names",
                callback: this._cmdShowDBList,
                detail: "Show database names",
            });
            this.registerCommand("jstest", {
                definition: "Launch JS Tests",
                callback: this._cmdJSTest,
                detail: "Runs js tests in desktop or mobile mode for the selected module.",
                args: [
                    "s::m:module::0::The module technical name",
                    "s::d:device::0::The device to test::desktop::desktop:mobile",
                ],
                example: "-m web -d mobile",
            });
            this.registerCommand("tour", {
                definition: "Launch Tour",
                callback: this._cmdRunTour,
                detail: "Runs the selected tour. If no tour given, prints all available tours.",
                args: ["s::n:name::0::The tour technical name"],
                example: "-n mail_tour",
            });
            this.registerCommand("json", {
                definition: "Send POST JSON",
                callback: this._cmdPostJSONData,
                detail: "Sends HTTP POST 'application/json' request",
                args: [
                    "s::e:endpoint::1::The endpoint",
                    "j::d:data::1::The data to send",
                ],
                example: "/web/endpoint \"{'the_example': 42}\"",
            });
            this.registerCommand("depends", {
                definition: "Know modules that depends on the given module",
                callback: this._cmdModuleDepends,
                detail: "Show a list of the modules that depends on the given module",
                args: ["s::m:module::0::The module technical name"],
                example: "base",
            });
            this.registerCommand("ual", {
                definition: "Update apps list",
                callback: this._cmdUpdateAppList,
                detail: "Update apps list",
            });
            this.registerCommand("logout", {
                definition: "Log out",
                callback: this._cmdLogOut,
                detail: "Session log out",
            });
            this.registerCommand("count", {
                definition:
                    "Gets number of records from the given model in the selected domain",
                callback: this._cmdCount,
                detail: "Gets number of records from the given model in the selected domain",
                args: [
                    "s::m:model::1::The model technical name",
                    "j::d:domain::0::The domain::[]",
                ],
                example: "res.partner ['name', '=ilike', 'A%']",
            });
            this.registerCommand("ref", {
                definition:
                    "Show the referenced model and id of the given xmlid's",
                callback: this._cmdRef,
                detail: "Show the referenced model and id of the given xmlid's",
                args: ["ls::x:xmlid::1::The XML-ID"],
                example: "-x base.main_company,base.model_res_partner",
            });
            this.registerCommand("lang", {
                definition: "Operations over translations",
                callback: this._cmdLang,
                detail: "Operations over translations.",
                args: [
                    "s::o:operation::1::The operation::::export:import:list",
                    "s::l:lang::0::The language<br/>Can use '__new__' for new language (empty translation template)",
                    "ls::m:module::0::The technical module name",
                    "s::f:format::0::The format to use::po::po:csv",
                    "s::n:name::0::The language name",
                    "f::no-overwrite:no-overwrite::0::Flag to indicate dont overwrite current translations",
                ],
                example: "-o export -l en_US -m mail",
            });
        },

        _cmdLang: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                try {
                    const is_empty_args = _.chain(kwargs)
                        .omit(["operation", "format"])
                        .isEmpty()
                        .value();
                    if (kwargs.operation === "export") {
                        if (is_empty_args) {
                            return resolve(
                                this.do_action("base.action_wizard_lang_export")
                            );
                        }
                        if (
                            !kwargs.lang ||
                            !kwargs.format ||
                            _.isEmpty(kwargs.module)
                        ) {
                            return reject(
                                "'export' operation needs the following arguments: --lang, --format, --module"
                            );
                        }
                        // Get module ids
                        let module_ids = await rpc.query({
                            method: "search_read",
                            domain: [["name", "in", kwargs.module]],
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
                                    format: kwargs.format,
                                    lang: kwargs.lang,
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
                    } else if (kwargs.operation === "import") {
                        if (is_empty_args) {
                            return resolve(
                                this.do_action(
                                    "base.action_view_base_import_language"
                                )
                            );
                        }
                        if (
                            !kwargs.name ||
                            !kwargs.lang ||
                            !kwargs.format ||
                            _.isEmpty(kwargs.module)
                        ) {
                            return reject(
                                "'import' operation needs the following arguments: --name, --lang, --format, --module"
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
                                    name: kwargs.name,
                                    code: kwargs.lang,
                                    filename: `${kwargs.lang}.${kwargs.format}`,
                                    overwrite: !kwargs.no_overwrite,
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
                    } else if (kwargs.operation === "list") {
                        const langs = await rpc.query({
                            method: "get_installed",
                            model: "res.lang",
                            kwargs: {context: this._getContext()},
                        });
                        for (const lang of langs) {
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

        _cmdRef: function (kwargs) {
            const tasks = [];
            for (const xmlid of kwargs.xmlid) {
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

        _cmdCount: function (kwargs) {
            return rpc
                .query({
                    method: "search_count",
                    model: kwargs.model,
                    args: [kwargs.domain],
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

        _cmdModuleDepends: function (kwargs) {
            return rpc
                .query({
                    method: "onchange_module",
                    model: "res.config.settings",
                    args: [false, false, kwargs.module],
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

        _cmdPostJSONData: function (kwargs) {
            return rpc
                .query({
                    route: kwargs.endpoint,
                    params: kwargs.data,
                })
                .then((result) => {
                    this.screen.print(result);
                    return result;
                });
        },

        _cmdRunTour: function (kwargs) {
            const tour_names = Object.keys(tour.tours);
            if (kwargs.name) {
                if (tour_names.indexOf(kwargs.name) === -1) {
                    this.screen.printError("The given tour doesn't exists!");
                } else {
                    odoo.__DEBUG__.services["web_tour.tour"].run(kwargs.name);
                    this.screen.print("Running tour...");
                }
            } else if (tour_names.length) {
                this.screen.print(tour_names);
            } else {
                this.screen.print("The tour list is empty");
            }
            return Promise.resolve();
        },

        _cmdJSTest: function (kwargs) {
            let mod = kwargs.module || "";
            if (kwargs.module === "*") {
                mod = "";
            }
            let url = "/web/tests";
            if (kwargs.device === "mobile") {
                url += "/mobile";
            }
            url += `?module=${mod}`;
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

        _cmdUserHasGroups: function (kwargs) {
            return rpc
                .query({
                    method: "user_has_groups",
                    model: "res.users",
                    args: [kwargs.group],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(result);
                    return result;
                });
        },

        _cmdLoginAs: function (kwargs) {
            let db = kwargs.database;
            let login = kwargs.user;
            let passwd = kwargs.password || false;
            if (login[0] === "#" && !passwd) {
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

        _cmdLongpolling: function (kwargs) {
            if (!this._longpolling) {
                return Promise.reject(
                    "Can't use longpolling, 'bus' module is not installed"
                );
            }

            if (typeof kwargs.operation === "undefined") {
                this.screen.print(this._longpolling.isVerbose() || "off");
            } else if (kwargs.operation === "verbose") {
                this._longpolling.setVerbose(true);
                this.screen.print("Now long-polling is in verbose mode.");
            } else if (kwargs.operation === "off") {
                this._longpolling.setVerbose(false);
                this.screen.print("Now long-polling verbose mode is disabled");
            } else if (kwargs.operation === "add_channel") {
                this._longPollingAddChannel(kwargs.param);
            } else if (kwargs.operation === "del_channel") {
                this._longPollingDelChannel(kwargs.param);
            } else if (kwargs.operation === "start") {
                this._longpolling.startPoll();
                this.screen.print("Longpolling started");
            } else if (kwargs.operation === "stop") {
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

        _cmdContextOperation: function (kwargs) {
            if (kwargs.operation === "read") {
                this.screen.print(session.user_context);
            } else if (kwargs.operation === "set") {
                session.user_context = kwargs.value;
                this.screen.print(session.user_context);
            } else if (kwargs.operation === "write") {
                Object.assign(session.user_context, kwargs.value);
                this.screen.print(session.user_context);
            } else if (kwargs.operation === "delete") {
                if (
                    Object.prototype.hasOwnProperty.call(
                        session.user_context,
                        kwargs.value
                    )
                ) {
                    delete session.user_context[kwargs.value];
                    this.screen.print(session.user_context);
                } else {
                    this.screen.printError(
                        "The selected key is not present in the terminal context"
                    );
                }
            }
            return Promise.resolve();
        },

        _cmdSearchModelRecordId: function (kwargs) {
            const fields = kwargs.field[0] === "*" ? false : kwargs.field;
            return rpc
                .query({
                    method: "search_read",
                    domain: [["id", "in", kwargs.id]],
                    fields: fields,
                    model: kwargs.model,
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.printRecords(kwargs.model, result);
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

        _cmdCheckModelAccess: function (kwargs) {
            return rpc
                .query({
                    method: "check_access_rights",
                    model: kwargs.model,
                    args: [kwargs.operation, false],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    if (result) {
                        this.screen.print(
                            `You have access rights for '${kwargs.operation}' on ${kwargs.model}`
                        );
                    } else {
                        this.screen.print(
                            `You can't '${kwargs.operation}' on ${kwargs.model}`
                        );
                    }
                    return result;
                });
        },

        _cmdCheckFieldAccess: function (kwargs) {
            const fields = kwargs.field[0] === "*" ? false : kwargs.field;
            return rpc
                .query({
                    method: "fields_get",
                    model: kwargs.model,
                    args: [fields],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    let s_result = null;
                    const keys = Object.keys(result).sort();
                    if (_.isEmpty(kwargs.filter)) {
                        s_result = result;
                    } else {
                        s_result = [];
                        for (const key of keys) {
                            if (_.isMatch(result[key], kwargs.filter)) {
                                s_result[key] = result[key];
                            }
                        }
                    }
                    const s_keys = Object.keys(s_result).sort();
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
                    const len = s_keys.length;
                    for (let x = 0; x < len; ++x) {
                        const field = s_keys[x];
                        const fieldDef = s_result[field];
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
                    return s_result;
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

        _cmdSetDebugMode: function (kwargs) {
            if (kwargs.mode === 0) {
                this.screen.print(
                    "Debug mode <strong>disabled</strong>. Reloading page..."
                );
                const qs = $.deparam.querystring();
                delete qs.debug;
                window.location.search = "?" + $.param(qs);
            } else if (kwargs.mode === 1) {
                this.screen.print(
                    "Debug mode <strong>enabled</strong>. Reloading page..."
                );
                window.location = $.param.querystring(
                    window.location.href,
                    "debug=1"
                );
            } else if (kwargs.mode === 2) {
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

        _cmdUpgradeModule: function (kwargs) {
            return this._searchModule(kwargs.module).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_upgrade",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            this.screen.print(
                                `'${kwargs.module}' module successfully upgraded`
                            );
                        },
                        () => {
                            this.screen.printError(
                                `Can't upgrade '${kwargs.module}' module`
                            );
                        }
                    );
                } else {
                    this.screen.printError(
                        `'${kwargs.module}' module doesn't exists`
                    );
                }
            });
        },

        _cmdInstallModule: function (kwargs) {
            return this._searchModule(kwargs.module).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_install",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            this.screen.print(
                                `'${kwargs.module}' module successfully installed`
                            );
                        },
                        () => {
                            this.screen.printError(
                                `Can't install '${kwargs.module}' module`
                            );
                        }
                    );
                } else {
                    this.screen.printError(
                        `'${kwargs.module}' module doesn't exists`
                    );
                }
            });
        },

        _cmdUninstallModule: function (kwargs) {
            return this._searchModule(kwargs.module).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: "button_immediate_uninstall",
                        model: "ir.module.module",
                        args: [result[0].id],
                    }).then(
                        () => {
                            this.screen.print(
                                `'${kwargs.module}' module successfully uninstalled`
                            );
                        },
                        () => {
                            this.screen.printError(
                                `Can't uninstall '${kwargs.module}' module`
                            );
                        }
                    );
                } else {
                    this.screen.printError(
                        `'${kwargs.module}' module doesn't exists`
                    );
                }
            });
        },

        _cmdCallModelMethod: function (kwargs) {
            const pkwargs = kwargs.kwarg;
            if (typeof pkwargs.context === "undefined") {
                pkwargs.context = this._getContext();
            }
            return rpc
                .query({
                    method: kwargs.method,
                    model: kwargs.model,
                    args: kwargs.arguments,
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

        _cmdSearchModelRecord: function (kwargs) {
            const lines_total = this.screen._max_lines - 3;
            const fields = kwargs.field[0] === "*" ? false : kwargs.field;

            if (kwargs.more) {
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
                    domain: kwargs.domain,
                    fields: fields,
                    model: kwargs.model,
                    limit: kwargs.limit,
                    offset: kwargs.offset,
                    orderBy: this._deserializeSort(kwargs.order),
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    const need_truncate = result.length > lines_total;
                    let sresult = result;
                    if (need_truncate) {
                        this._buffer[this.__meta.name] = {
                            model: kwargs.model,
                            data: sresult.slice(lines_total),
                        };
                        sresult = sresult.slice(0, lines_total);
                    }
                    this.screen.printRecords(kwargs.model, sresult);
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

        _cmdCreateModelRecord: function (kwargs) {
            if (typeof kwargs.value === "undefined") {
                return this.do_action({
                    type: "ir.actions.act_window",
                    res_model: kwargs.model,
                    views: [[false, "form"]],
                    target: "current",
                }).then(() => {
                    this.doHide();
                });
            }
            return rpc
                .query({
                    method: "create",
                    model: kwargs.model,
                    args: [kwargs.value],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(
                        this._templates.render("RECORD_CREATED", {
                            model: kwargs.model,
                            new_id: result,
                        })
                    );
                    return result;
                });
        },

        _cmdUnlinkModelRecord: function (kwargs) {
            return rpc
                .query({
                    method: "unlink",
                    model: kwargs.model,
                    args: [kwargs.id],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(
                        `${kwargs.model} record deleted successfully`
                    );
                    return result;
                });
        },

        _cmdWriteModelRecord: function (kwargs) {
            return rpc
                .query({
                    method: "write",
                    model: kwargs.model,
                    args: [kwargs.id, kwargs.value],
                    kwargs: {context: this._getContext()},
                })
                .then((result) => {
                    this.screen.print(
                        `${kwargs.model} record updated successfully`
                    );
                    return result;
                });
        },

        _cmdCallAction: function (kwargs) {
            return this.do_action(kwargs.action);
        },

        _cmdPostData: function (kwargs) {
            return ajax.post(kwargs.endpoint, kwargs.data).then((result) => {
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
