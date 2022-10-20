// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.functions.Core", function (require) {
    "use strict";

    const rpc = require("terminal.core.rpc");
    const Terminal = require("terminal.Terminal");
    const Utils = require("terminal.core.Utils");
    const TrashConst = require("terminal.core.trash.const");
    const ParameterGenerator = require("terminal.core.ParameterGenerator");
    const TemplateManager = require("terminal.core.TemplateManager");
    const Recordset = require("terminal.core.recordset");
    const time = require("web.time");

    Terminal.include({
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand("help", {
                definition: "Print this help or command detailed info",
                callback: this._cmdPrintHelp,
                detail:
                    "Show commands and a quick definition.<br/>- " +
                    "<> ~> Required Parameter<br/>- [] ~> Optional Parameter",
                args: [["s", ["c", "cmd"], false, "The command to consult"]],
                example: "-c search",
            });
            this.registerCommand("clear", {
                definition: "Clean terminal section",
                callback: this._cmdClear,
                detail: "Clean the selected section",
                args: [
                    [
                        TrashConst.ARG.String,
                        ["s", "section"],
                        false,
                        "The section to clear<br/>- screen: Clean the screen<br/>- history: Clean the command history",
                        "screen",
                        ["screen", "history"],
                    ],
                ],
                example: "-s history",
            });
            this.registerCommand("print", {
                definition: "Print a message",
                callback: this._cmdPrint,
                detail: "Eval parameters and print the result.",
                args: [
                    [
                        TrashConst.ARG.Any,
                        ["m", "msg"],
                        true,
                        "The message to print",
                    ],
                ],
                aliases: ["echo"],
                example: "-m 'This is a example'",
            });
            this.registerCommand("load", {
                definition: "Load external resource",
                callback: this._cmdLoadResource,
                detail: "Load external source (javascript & css)",
                args: [
                    [
                        TrashConst.ARG.String,
                        ["u", "url"],
                        true,
                        "The URL of the asset",
                    ],
                ],
                example: "-u https://example.com/libs/term_extra.js",
            });
            this.registerCommand("context_term", {
                definition: "Operations over terminal context dictionary",
                callback: this._cmdTerminalContextOperation,
                detail:
                    "Operations over terminal context dictionary. " +
                    "This context only affects to the terminal operations.",
                args: [
                    [
                        TrashConst.ARG.String,
                        ["o", "operation"],
                        false,
                        "The operation to do",
                        "read",
                        ["read", "write", "set", "delete"],
                    ],
                    ["-", ["v", "value"], false, "The value"],
                ],
                example: "-o write -v {the_example: 1}",
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
                    [
                        TrashConst.ARG.String,
                        ["n", "name"],
                        false,
                        "The name of the alias",
                    ],
                    [
                        TrashConst.ARG.String,
                        ["c", "cmd"],
                        false,
                        "The command to run",
                    ],
                ],
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
                args: [
                    [
                        TrashConst.ARG.Any,
                        ["v", "value"],
                        true,
                        "The value to export",
                    ],
                ],
                example: "-v $(search res.partner)",
            });
            this.registerCommand("exportfile", {
                definition: "Exports the command result to a text/json file",
                callback: this._cmdExportFile,
                detail: "Exports the command result to a text/json file.",
                args: [
                    [
                        TrashConst.ARG.Any,
                        ["v", "value"],
                        true,
                        "The value to export",
                    ],
                ],
                example: "-c 'search res.partner'",
            });
            this.registerCommand("chrono", {
                definition: "Print the time expended executing a command",
                callback: this._cmdChrono,
                detail:
                    "Print the elapsed time in seconds to execute a command. " +
                    "<br/>Notice that this time includes the time to format the result!",
                syntax: "<STRING: COMMAND>",
                args: [
                    [
                        TrashConst.ARG.String,
                        ["c", "cmd"],
                        true,
                        "The command to run",
                    ],
                ],
                example: "-c 'search res.partner'",
            });
            this.registerCommand("repeat", {
                definition: "Repeat a command N times",
                callback: this._cmdRepeat,
                detail: "Repeat a command N times.",
                args: [
                    [
                        TrashConst.ARG.Number,
                        ["t", "times"],
                        true,
                        "Times to run",
                    ],
                    [
                        TrashConst.ARG.String,
                        ["c", "cmd"],
                        true,
                        "The command to run",
                    ],
                    [
                        TrashConst.ARG.Flag,
                        ["silent", "silent"],
                        false,
                        "Used to don't print command output",
                    ],
                ],
                example:
                    "-t 20 -c \"create res.partner {name: 'Example Partner #$INTITER'}\"",
            });
            this.registerCommand("jobs", {
                definition: "Display running jobs",
                callback: this._cmdJobs,
                detail: "Display running jobs",
            });
            this.registerCommand("toggle_term", {
                definition: "Toggle terminal visibility",
                callback: this._cmdToggleTerm,
                detail: "Toggle terminal visibility",
            });
            this.registerCommand("dis", {
                definition: "Dissasembler bytecode",
                callback: this._cmdDis,
                detail: "Shows the bytecode generated for the input",
                args: [
                    [TrashConst.ARG.String, ["c", "code"], true, "TraSH Code"],
                ],
                example: "-c \"print $var[0]['key'] + ' -> ' + 1234\"",
            });
            this.registerCommand("gen", {
                definition: "Generate numbers, strings, url's, dates, etc...",
                callback: this._cmdGen,
                detail: "Shows the bytecode generated for the input",
                args: [
                    [
                        TrashConst.ARG.String,
                        ["t", "type"],
                        true,
                        "Generator type",
                        "str",
                        [
                            "str",
                            "float",
                            "int",
                            "intseq",
                            "intiter",
                            "date",
                            "tzdate",
                            "time",
                            "tztime",
                            "datetime",
                            "tzdatetime",
                            "email",
                            "url",
                        ],
                    ],
                    [
                        TrashConst.ARG.Number,
                        ["mi", "min"],
                        false,
                        "Min. value",
                        1,
                    ],
                    [TrashConst.ARG.Number, ["ma", "max"], false, "Max. value"],
                ],
                example: "-t str -mi 2 -ma 4",
            });
            this.registerCommand("now", {
                definition: "Current time",
                callback: this._cmdNow,
                detail: "Prints the current time",
                args: [
                    [
                        TrashConst.ARG.String,
                        ["t", "type"],
                        false,
                        "Date type",
                        "full",
                        ["full", "date", "time"],
                    ],
                    [
                        TrashConst.ARG.Flag,
                        ["tz", "tz"],
                        false,
                        "Use timezone",
                        false,
                    ],
                ],
                example: "-t time --tz",
            });
            this.registerCommand("commit", {
                definition: "Commit recordset changes",
                callback: this._cmdCommit,
                detail: "Write recordset changes",
                args: [
                    [
                        TrashConst.ARG.Any,
                        ["r", "recordset"],
                        true,
                        "The Recordset",
                    ],
                ],
                example: "-r $recordset",
            });
            this.registerCommand("rollback", {
                definition: "Revert recordset changes",
                callback: this._cmdRollback,
                detail: "Undo recordset changes",
                args: [
                    [
                        TrashConst.ARG.Any,
                        ["r", "recordset"],
                        true,
                        "The Recordset",
                    ],
                ],
                example: "-r $recordset",
            });
        },

        _cmdCommit: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                if (!Recordset.isValid(kwargs.recordset)) {
                    return reject(`Invalid recordset`);
                }

                const values_to_write = kwargs.recordset.toWrite();
                if (_.isEmpty(values_to_write)) {
                    this.screen.printError("Nothing to commit!");
                    return resolve(false);
                }
                const pids = [];
                const tasks = [];
                for (const [rec_id, values] of values_to_write) {
                    tasks.push(
                        rpc.query({
                            method: "write",
                            model: kwargs.recordset.model,
                            args: [rec_id, values],
                            kwargs: {context: this._getContext()},
                        })
                    );
                    pids.push(rec_id);
                }

                await Promise.all(tasks);
                kwargs.recordset.persist();
                this.screen.print(
                    `Records '${pids}' of ${kwargs.recordset.model} updated successfully`
                );
                return resolve(true);
            });
        },

        _cmdRollback: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                if (!Recordset.isValid(kwargs.recordset)) {
                    return reject(`Invalid recordset`);
                }

                kwargs.recordset.rollback();
                this.screen.print(`Recordset changes undone`);
                return resolve(true);
            });
        },

        _cmdNow: function (kwargs) {
            let res = false;
            if (kwargs.type === "full") {
                if (kwargs.tz) {
                    res = moment().format(time.getLangDatetimeFormat());
                } else {
                    res = time.datetime_to_str(new Date());
                }
            } else if (kwargs.type === "date") {
                if (kwargs.tz) {
                    res = moment().format(time.getLangDateFormat());
                } else {
                    res = time.date_to_str(new Date());
                }
            } else if (kwargs.type === "time") {
                if (kwargs.tz) {
                    res = moment().format(time.getLangTimeFormat());
                } else {
                    res = time.time_to_str(new Date());
                }
            }

            this.screen.print(res);
            return Promise.resolve(res);
        },

        _cmdGen: function (kwargs) {
            const parameterGenerator = new ParameterGenerator();
            const type = kwargs.type.toLowerCase();
            let result = false;
            if (type === "email") {
                result = parameterGenerator.generateEmail(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "url") {
                result = parameterGenerator.generateUrl(kwargs.min, kwargs.max);
            } else if (type === "float") {
                result = parameterGenerator.generateFloat(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "int") {
                result = parameterGenerator.generateInt(kwargs.min, kwargs.max);
            } else if (type === "intseq") {
                result = parameterGenerator.generateIntSeq(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "intiter") {
                result = parameterGenerator.doIntIter(kwargs.min, kwargs.max);
            } else if (type === "str") {
                result = parameterGenerator.generateString(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "tzdate") {
                result = parameterGenerator.generateTzDate(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "date") {
                result = parameterGenerator.generateDate(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "tztime") {
                result = parameterGenerator.generateTzTime(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "time") {
                result = parameterGenerator.generateTime(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "tzdatetime") {
                result = parameterGenerator.generateTzDateTime(
                    kwargs.min,
                    kwargs.max
                );
            } else if (type === "datetime") {
                result = parameterGenerator.generateDateTime(
                    kwargs.min,
                    kwargs.max
                );
            }
            this.screen.print(result);
            return Promise.resolve(result);
        },

        _cmdDis: function (kwargs) {
            const parse_info = this._virtMachine.interpreter.parse(
                kwargs.code,
                {registeredCmds: this._registeredCmds}
            );
            const stack = parse_info.stack;
            for (const instr of stack.instructions) {
                const [type] = instr;
                let lvalue = "";
                switch (type) {
                    case TrashConst.PARSER.LOAD_NAME:
                    case TrashConst.PARSER.LOAD_GLOBAL:
                    case TrashConst.PARSER.STORE_NAME:
                    case TrashConst.PARSER.STORE_SUBSCR:
                        lvalue = stack.names.shift();
                        break;
                    case TrashConst.PARSER.LOAD_CONST:
                        lvalue = stack.values.shift();
                        break;
                    case TrashConst.PARSER.LOAD_ARG:
                        lvalue = stack.arguments.shift();
                        break;
                }

                this.screen.print(
                    `${TrashConst.PARSER.getHumanType(instr[0])} (${lvalue})`
                );
            }

            return Promise.resolve(true);
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
                TemplateManager.render("HELP_CMD", {
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
                const arg_info = this._virtMachine
                    .getInterpreter()
                    .getArgumentInfo(arg);
                const lnames = [
                    `-${arg_info.names.short}`,
                    `--${arg_info.names.long}`,
                ];
                const arg_symbols = arg_info.is_required
                    ? ["<", ">"]
                    : ["[", "]"];
                arg_info_str += `${arg_symbols[0]}${lnames.join(
                    ", "
                )} [${TrashConst.ARG.getHumanType(arg_info.type)}`;
                if (_.isEmpty(arg_info.strict_values)) {
                    arg_info_str += `]${arg_symbols[1]}`;
                } else {
                    arg_info_str += `(${arg_info.strict_values.join("|")})]${
                        arg_symbols[1]
                    }`;
                }
                if (typeof arg_info.default_value !== "undefined") {
                    arg_info_str += ` (default is ${
                        arg_info.type[0] === TrashConst.ARG.List
                            ? arg_info.default_value.join(",")
                            : arg_info.type[0] === TrashConst.ARG.Dictionary
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

        _cmdPrint: function (kwargs) {
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
            const varname = _.uniqueId("term");
            window[varname] = kwargs.value;
            this.screen.print(
                `Command result exported! now you can use '${varname}' variable in the browser console`
            );
            return Promise.resolve(varname);
        },

        _cmdExportFile: function (kwargs) {
            const filename = `${_.uniqueId(
                "term"
            )}_${new Date().getTime()}.json`;
            const data = JSON.stringify(kwargs.value, null, 4);
            Utils.save2File(filename, "text/json", data);
            this.screen.print(`Command result exported to '${filename}' file`);
            return Promise.resolve(filename);
        },

        _cmdChrono: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                let time_elapsed_secs = -1;
                try {
                    const start_time = new Date();
                    await this.execute(kwargs.cmd, false);
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
                const res = [];
                const do_repeat = (rtimes) => {
                    if (!rtimes) {
                        this.screen.print(
                            `<i>** Repeat finsihed: '${kwargs.cmd}' called ${kwargs.times} times</i>`
                        );
                        return resolve(res);
                    }
                    return this._virtMachine
                        .eval(kwargs.cmd, {silent: kwargs.silent})
                        .then((result) => res.push(result))
                        .finally(() => do_repeat(rtimes - 1));
                };
                return do_repeat(kwargs.times);
            });
        },

        _cmdJobs: function () {
            const jobs = _.compact(this._jobs);
            this.screen.print(
                _.map(
                    jobs,
                    (item) =>
                        `${item.cmdInfo.cmdName} <small><i>${
                            item.cmdInfo.cmdRaw
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
