// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.functions.Core", function (require) {
    "use strict";

    const Terminal = require("terminal.Terminal");
    const Utils = require("terminal.core.Utils");

    Terminal.include({
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand("help", {
                definition: "Print this help or command detailed info",
                callback: this._cmdPrintHelp,
                detail:
                    "Show commands and a quick definition.<br/>- " +
                    "<> ~> Required Parameter<br/>- [] ~> Optional Parameter",
                args: ["s::c:cmd::0::The command to consult"],
                example: "-c search",
            });
            this.registerCommand("clear", {
                definition: "Clean terminal section",
                callback: this._cmdClear,
                detail: "Clean the selected section",
                args: [
                    "s::s:section::0::The section to clear<br/>- screen: Clean the screen<br/>- history: Clean the command history::screen::screen:history",
                ],
                example: "-s history",
            });
            this.registerCommand("print", {
                definition: "Print a message",
                callback: this._cmdPrintText,
                detail: "Eval parameters and print the result.",
                args: ["s::m:msg::1::The message to print"],
                aliases: ["echo"],
                example: "-m 'This is a example'",
            });
            this.registerCommand("load", {
                definition: "Load external resource",
                callback: this._cmdLoadResource,
                detail: "Load external source (javascript & css)",
                args: ["s::u:url::1::The URL of the asset"],
                example: "-u https://example.com/libs/term_extra.js",
            });
            this.registerCommand("context_term", {
                definition: "Operations over terminal context dictionary",
                callback: this._cmdTerminalContextOperation,
                detail:
                    "Operations over terminal context dictionary. " +
                    "This context only affects to the terminal operations.",
                args: [
                    "s::o:operation::0::The operation to do::read::read:write:set:delete",
                    "-::v:value::0::The URL of the asset::false",
                ],
                example: "-o write -v \"{'the_example': 1}\"",
            });
            this.registerCommand("alias", {
                definition: "Create aliases",
                callback: this._cmdAlias,
                detail:
                    "Define aliases to run commands easy. " +
                    "<br><b>WARNING:</b> This command uses 'local storage' " +
                    "to persist the data even if you close the browser. " +
                    "This data can be easy accessed by other computer users. " +
                    "Don't use sensible data if you are using a shared " +
                    "computer." +
                    "<br><br>Can use positional parameters ($1,$2,$3,$N...)",
                args: [
                    "s::n:name::0::The name of the alias",
                    "s::c:cmd::0::The command to run",
                ],
                sanitized: false,
                generators: false,
                example: "-n myalias -c \"print 'Hello, $1!'\"",
            });
            this.registerCommand("quit", {
                definition: "Close terminal",
                callback: this._cmdQuit,
                detail: "Close the terminal.",
            });
            this.registerCommand("exportvar", {
                definition:
                    "Exports the command result to a browser console variable",
                callback: this._cmdExportVar,
                detail: "Exports the command result to a browser console variable.",
                args: ["s::c:cmd::1::The command to run and export the result"],
                sanitized: false,
                generators: false,
                example: "-c 'search res.partner'",
            });
            this.registerCommand("exportfile", {
                definition: "Exports the command result to a text/json file",
                callback: this._cmdExportFile,
                detail: "Exports the command result to a text/json file.",
                args: ["s::c:cmd::1::The command to run and export the result"],
                sanitized: false,
                generators: false,
                example: "-c 'search res.partner'",
            });
            this.registerCommand("chrono", {
                definition: "Print the time expended executing a command",
                callback: this._cmdChrono,
                detail:
                    "Print the elapsed time in seconds to execute a command. " +
                    "<br/>Notice that this time includes the time to format the result!",
                syntax: "<STRING: COMMAND>",
                args: ["s::c:cmd::1::The command to run"],
                sanitized: false,
                generators: false,
                example: "-c 'search res.partner'",
            });
            this.registerCommand("repeat", {
                definition: "Repeat a command N times",
                callback: this._cmdRepeat,
                detail: "Repeat a command N times.",
                args: [
                    "i::t:times::1::Times to run",
                    "s::c:cmd::1::The command to run",
                    "f::silent:silent::0::Used to don't print command output",
                ],
                sanitized: false,
                generators: false,
                example:
                    '-t 20 -c "create res.partner \'{\\"name\\": \\"Example Partner #$INTITER\\"}\'"',
            });
            this.registerCommand("jobs", {
                definition: "Display running jobs",
                callback: this._cmdJobs,
                detail: "Display running jobs",
                args: "",
                sanitized: false,
                generators: false,
                example: "",
            });
            this.registerCommand("toggle_term", {
                definition: "Toggle terminal visibility",
                callback: this._cmdToggleTerm,
                detail: "Toggle terminal visibility",
                args: "",
                sanitized: false,
                generators: false,
                example: "",
            });
        },

        _cmdToggleTerm: function () {
            return this.doToggle();
        },

        _printWelcomeMessage: function () {
            this._super.apply(this, arguments);
            this.screen.print(
                "Type '<i class='o_terminal_click o_terminal_cmd' " +
                    "data-cmd='help'>help</i>' or '<i class='o_terminal_click " +
                    "o_terminal_cmd' data-cmd='help help'>help " +
                    "&lt;command&gt;</i>' to start."
            );
        },

        _printHelpSimple: function (cmd, cmd_def) {
            this.screen.print(
                this._templates.render("HELP_CMD", {
                    cmd: cmd,
                    def: cmd_def.definition,
                })
            );
        },

        _printHelpDetailed: function (cmd, cmd_def) {
            this.screen.eprint("NAME");
            this.screen.print(
                `<div class="terminal-info-section">${cmd} - ${cmd_def.definition}</div>`
            );
            this.screen.print(" ");
            this.screen.eprint("DESCRIPTION");
            this.screen.print(
                `<div class="terminal-info-section">${cmd_def.detail}</div>`
            );
            // Create arguments text
            this.screen.print(" ");
            this.screen.eprint("ARGUMENTS");
            const args = [];
            let arg_info_str = "";
            for (const arg of cmd_def.args) {
                const arg_info = this._parameterReader.getArgumentInfo(arg);
                const lnames = [
                    `-${arg_info.names.short}`,
                    `--${arg_info.names.long}`,
                ];
                const arg_symbols = arg_info.is_required
                    ? ["<", ">"]
                    : ["[", "]"];
                arg_info_str += `${arg_symbols[0]}${lnames.join(
                    ", "
                )} [${this._parameterReader.getHumanType(arg_info.type)}`;
                if (_.isEmpty(arg_info.strict_values)) {
                    arg_info_str += `]${arg_symbols[1]}`;
                } else {
                    arg_info_str += `(${arg_info.strict_values.join("|")})]${
                        arg_symbols[1]
                    }`;
                }
                if (typeof arg_info.default_value !== "undefined") {
                    arg_info_str += ` (default is ${
                        arg_info.type[0] === "l"
                            ? arg_info.default_value.join(",")
                            : arg_info.type[0] === "j"
                            ? JSON.stringify(arg_info.default_value)
                            : arg_info.default_value
                    })`;
                }
                arg_info_str += `<div class="terminal-info-description">${arg_info.description}</div>`;
                arg_info_str += "<br/>";
            }
            this.screen.print(
                `<div class="terminal-info-section">${arg_info_str}</div>`
            );
            this.screen.print(args);
            if (cmd_def.example) {
                this.screen.eprint("EXAMPLE");
                this.screen.print(
                    `<div class="terminal-info-section">${cmd} ${cmd_def.example}</div>`
                );
            }
        },

        _cmdPrintHelp: function (kwargs) {
            if (typeof kwargs.cmd === "undefined") {
                const sorted_cmd_keys = _.keys(this._registeredCmds).sort();
                const sorted_keys_len = sorted_cmd_keys.length;
                for (let x = 0; x < sorted_keys_len; ++x) {
                    const _cmd = sorted_cmd_keys[x];
                    this._printHelpSimple(_cmd, this._registeredCmds[_cmd]);
                }
            } else if (Object.hasOwn(this._registeredCmds, kwargs.cmd)) {
                this._printHelpDetailed(
                    kwargs.cmd,
                    this._registeredCmds[kwargs.cmd]
                );
            } else {
                const [ncmd, cmd_def] = this._searchCommandDefByAlias(
                    kwargs.cmd
                );
                if (cmd_def) {
                    this.screen.print(
                        this._templates.render("DEPRECATED_COMMAND", {
                            cmd: ncmd,
                        })
                    );
                    this._printHelpDetailed(ncmd, this._registeredCmds[ncmd]);
                }

                return Promise.reject(`'${kwargs.cmd}' command doesn't exists`);
            }
            return Promise.resolve();
        },

        _cmdClear: function (kwargs) {
            if (kwargs.section === "history") {
                this.cleanInputHistory();
            } else {
                this.screen.clean();
            }
            return Promise.resolve();
        },

        _cmdPrintText: function (kwargs) {
            this.screen.print(kwargs.msg);
            return Promise.resolve(kwargs.msg);
        },

        _cmdLoadResource: function (kwargs) {
            const inURL = new URL(kwargs.url);
            const pathname = inURL.pathname.toLowerCase();
            if (pathname.endsWith(".js")) {
                return new Promise((resolve, reject) => {
                    $.getScript(inURL.href).done(resolve).fail(reject);
                });
            } else if (pathname.endsWith(".css")) {
                $("<link>").appendTo("head").attr({
                    type: "text/css",
                    rel: "stylesheet",
                    href: inURL.href,
                });
            } else {
                return Promise.reject("Invalid file type");
            }
            return Promise.resolve();
        },

        _cmdTerminalContextOperation: function (kwargs) {
            if (kwargs.operation === "set") {
                this._userContext = kwargs.value;
            } else if (kwargs.operation === "write") {
                Object.assign(this._userContext, kwargs.value);
            } else if (kwargs.operation === "delete") {
                if (Object.hasOwn(this._userContext, kwargs.value)) {
                    delete this._userContext[kwargs.value];
                } else {
                    return Promise.reject(
                        "The selected key is not present in the terminal context"
                    );
                }
            }
            this.screen.print(this._userContext);
            return Promise.resolve(this._userContext);
        },

        _cmdAlias: function (kwargs) {
            const aliases =
                this._storageLocal.getItem("terminal_aliases") || {};
            if (!kwargs.name) {
                if (_.isEmpty(aliases)) {
                    this.screen.print("No aliases defined.");
                } else {
                    for (const alias_name in aliases) {
                        this.screen.printHTML(
                            ` - ${alias_name}  <small class="text-muted"><i>${aliases[alias_name]}</i></small>`
                        );
                    }
                }
                return Promise.resolve(aliases);
            } else if (Object.hasOwn(this._registeredCmds, kwargs.name)) {
                return Promise.reject("Invalid alias name");
            }
            if (_.some(kwargs.cmd)) {
                aliases[kwargs.name] = kwargs.cmd;
                this.screen.print("Alias created successfully");
            } else if (Object.hasOwn(aliases, kwargs.name)) {
                delete aliases[kwargs.name];
                this.screen.print("Alias removed successfully");
            } else {
                return Promise.reject("The selected alias not exists");
            }
            this._storageLocal.setItem("terminal_aliases", aliases, (err) =>
                this.screen.printHTML(err)
            );
            return Promise.resolve(aliases);
        },

        _cmdQuit: function () {
            this.doHide();
            return Promise.resolve();
        },

        _cmdExportVar: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                const varname = _.uniqueId("term");
                try {
                    // eslint-disable-next-line
                    const [cmd, cmd_name] = this.validateCommand(kwargs.cmd)[1];
                    if (!cmd_name) {
                        return reject("Need a valid command to execute!");
                    }
                    window[varname] = await this.executeCommand(
                        kwargs.cmd,
                        false,
                        true
                    );
                    this.screen.print(
                        `Command result exported! now you can use '${varname}' variable in the browser console`
                    );
                } catch (err) {
                    return reject(err);
                }
                return resolve(varname);
            });
        },

        _cmdExportFile: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                try {
                    // eslint-disable-next-line
                    const [cmd, cmd_name] = this.validateCommand(kwargs.cmd)[1];
                    if (!cmd_name) {
                        return reject("Need a valid command to execute!");
                    }
                    const filename = `${cmd_name}_${new Date().getTime()}.json`;
                    const result = await this.executeCommand(
                        kwargs.cmd,
                        false,
                        true
                    );
                    Utils.save2File(
                        filename,
                        "text/json",
                        JSON.stringify(result, null, 4)
                    );
                    this.screen.print(
                        `Command result exported to '${filename}' file`
                    );
                } catch (err) {
                    return reject(err);
                }
                return resolve();
            });
        },

        _cmdChrono: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                let time_elapsed_secs = -1;
                try {
                    const [cmd, cmd_name] = this.validateCommand(kwargs.cmd);
                    if (!cmd_name) {
                        return reject("Need a valid command to execute!");
                    }
                    const cmd_def = this._registeredCmds[cmd_name];
                    const scmd = this._parameterReader.parse(cmd, cmd_def);
                    const start_time = new Date();
                    await this._processCommandJob(scmd, cmd_def);
                    time_elapsed_secs = (new Date() - start_time) / 1000.0;
                    this.screen.print(
                        `Time elapsed: '${time_elapsed_secs}' seconds`
                    );
                } catch (err) {
                    return reject(err);
                }
                return resolve(time_elapsed_secs);
            });
        },

        _cmdRepeat: function (kwargs) {
            return new Promise((resolve, reject) => {
                if (kwargs.times < 0) {
                    return reject("'Times' parameter must be positive");
                }
                const [cmd, cmd_name] = this.validateCommand(kwargs.cmd);
                if (!cmd_name) {
                    return reject("Need a valid command to execute!");
                }
                const cmd_def = this._registeredCmds[cmd_name];
                const res = [];
                const do_repeat = (rtimes) => {
                    if (!rtimes) {
                        this.screen.print(
                            `<i>** Repeat finsihed: '${cmd_name}' command called ${kwargs.times} times</i>`
                        );
                        return resolve(res);
                    }
                    const scmd = this._parameterReader.parse(cmd, cmd_def);
                    this._processCommandJob(scmd, cmd_def, kwargs.silent)
                        .then((result) => res.push(result))
                        .finally(() => do_repeat(rtimes - 1));
                };
                do_repeat(kwargs.times);
            });
        },

        _cmdJobs: function () {
            const jobs = _.compact(this._jobs);
            this.screen.print(
                _.map(
                    jobs,
                    (item) =>
                        `${item.scmd.cmd} <small><i>${
                            item.scmd.cmdRaw
                        }</i></small> ${
                            item.healthy
                                ? ""
                                : '<span class="text-warning">This job is taking a long time</span>'
                        }`
                )
            );
            return Promise.resolve(jobs);
        },
    });
});
