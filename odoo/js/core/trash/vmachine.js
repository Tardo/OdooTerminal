// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.TraSH.vmachine", function (require) {
    "use strict";

    const TrashConst = require("terminal.core.trash.const");
    const Interpreter = require("terminal.core.TraSH.interpreter");
    const TemplateManager = require("terminal.core.TemplateManager");
    const Class = require("web.Class");

    const VMachine = Class.extend({
        init: function (registered_cmds, storage_local, options) {
            this._registeredCmds = registered_cmds;
            this.options = options;
            this.interpreter = new Interpreter(this, storage_local);
            this._registeredNames = {};
        },

        getInterpreter: function () {
            return this.interpreter;
        },

        _callFunction: function (frame, parse_info, silent) {
            return new Promise(async (resolve, reject) => {
                const cmd_def = this._registeredCmds[frame.cmd];
                if (cmd_def) {
                    const items_len = frame.values.length;
                    if (frame.args.length > items_len) {
                        return reject(`Invalid arguments!`);
                    }
                    let kwargs = {};
                    const values = frame.values;
                    for (let index = items_len - 1; index >= 0; --index) {
                        let arg_name = frame.args.pop();
                        if (!arg_name) {
                            const arg_def = cmd_def.args[index];
                            if (!arg_def) {
                                return reject(
                                    `Unexpected '${values[index]}' value!`
                                );
                            }
                            arg_name = arg_def[1][1];
                        }
                        kwargs[arg_name] = values[index];
                    }

                    try {
                        kwargs =
                            await this.getInterpreter().validateAndFormatArguments(
                                cmd_def,
                                kwargs
                            );
                        return resolve(
                            this.options.processCommandJob(
                                {
                                    cmdRaw: parse_info.inputRawString,
                                    cmdName: frame.cmd,
                                    cmdDef: cmd_def,
                                    kwargs: kwargs,
                                },
                                silent
                            )
                        );
                    } catch (err) {
                        return reject(err);
                    }
                }
                // Alias
                const alias_cmd = this.getInterpreter().parseAliases(
                    frame.cmd,
                    frame.values
                );
                return resolve((await this.eval(alias_cmd))[0]);
            });
        },

        _checkGlobalName: function (global_name, token) {
            if (
                !Object.hasOwn(this._registeredCmds, global_name) &&
                !this.getInterpreter().getAliasCommand(global_name)
            ) {
                // Search similar commands
                const similar_cmd =
                    this.getInterpreter().searchSimiliarCommand(global_name);
                if (similar_cmd) {
                    throw new Error(
                        TemplateManager.render("UNKNOWN_COMMAND", {
                            org_cmd: global_name,
                            cmd: similar_cmd,
                            pos: [token.start, token.end],
                        })
                    );
                }
                throw new Error(
                    `Unknown command '${global_name}' at ${token.start}:${token.end}`
                );
            }
        },

        eval: function (cmd_raw, options) {
            return new Promise(async (resolve, reject) => {
                const parse_info = this.interpreter.parse(cmd_raw, {
                    registeredCmds: this._registeredCmds,
                    registeredNames: this._registeredNames,
                    needResetStores: true,
                    ignoreCommandMode: options?.ignoreCommandMode,
                    forceReturn: options?.forceReturn,
                });
                const stack = parse_info.stack;
                const stack_instr_len = stack.instructions.length;
                const root_frame = {
                    store: {},
                    values: [],
                };
                const frames = [];
                const return_values = [];
                let last_frame = null;
                for (let index = 0; index < stack_instr_len; ++index) {
                    const [type, tindex, aindex] = stack.instructions[index];
                    const token =
                        tindex >= 0 ? parse_info.inputTokens[tindex] : null;
                    switch (type) {
                        case TrashConst.PARSER.LOAD_NAME:
                            {
                                const cmd_name = stack.names.shift();

                                // Check stores
                                const frame = last_frame || root_frame;
                                if (
                                    last_frame &&
                                    Object.hasOwn(last_frame.store, cmd_name)
                                ) {
                                    frame.values.push(
                                        last_frame.store[cmd_name]
                                    );
                                } else if (
                                    Object.hasOwn(root_frame.store, cmd_name)
                                ) {
                                    frame.values.push(
                                        root_frame.store[cmd_name]
                                    );
                                } else if (
                                    Object.hasOwn(
                                        this._registeredNames,
                                        cmd_name
                                    )
                                ) {
                                    frame.values.push(
                                        this._registeredNames[cmd_name]
                                    );
                                } else {
                                    return reject(
                                        `Unknown name '${cmd_name}' at ${token.start}:${token.end}`
                                    );
                                }
                            }
                            break;
                        case TrashConst.PARSER.LOAD_GLOBAL:
                            {
                                const cmd_name = stack.names.shift();
                                if (
                                    Object.hasOwn(
                                        this._registeredCmds,
                                        cmd_name
                                    ) ||
                                    this.getInterpreter().getAliasCommand(
                                        cmd_name
                                    )
                                ) {
                                    last_frame = {
                                        cmd: cmd_name,
                                        store: {},
                                        args: [],
                                        values: [],
                                    };
                                    frames.push(last_frame);
                                } else {
                                    // Search similar commands
                                    const similar_cmd =
                                        this.getInterpreter().searchSimiliarCommand(
                                            cmd_name,
                                            this._registeredCmds
                                        );
                                    if (similar_cmd) {
                                        return reject(
                                            TemplateManager.render(
                                                "UNKNOWN_COMMAND",
                                                {
                                                    org_cmd: cmd_name,
                                                    cmd: similar_cmd,
                                                    pos: [
                                                        token.start,
                                                        token.end,
                                                    ],
                                                }
                                            )
                                        );
                                    }
                                    return reject(
                                        `Unknown command '${cmd_name}' at ${token.start}:${token.end}`
                                    );
                                }
                            }
                            break;
                        case TrashConst.PARSER.LOAD_CONST:
                            {
                                const frame = last_frame || root_frame;
                                const value = stack.values.shift();
                                frame.values.push(value);
                            }
                            break;
                        case TrashConst.PARSER.LOAD_ARG:
                            {
                                const arg = stack.arguments.shift();
                                if (!last_frame) {
                                    return reject(
                                        `Argument '${arg}' not expected at ${token.start}:${token.end}`
                                    );
                                }
                                // Flag arguments can be implicit
                                const [next_type] =
                                    stack.instructions[index + 1] || [];
                                if (next_type > TrashConst.PARSER.LOAD_CONST) {
                                    last_frame.values.push(true);
                                }
                                last_frame.args.push(arg);
                            }
                            break;
                        case TrashConst.PARSER.CONCAT:
                            {
                                const allowed_types = [
                                    TrashConst.PARSER.LOAD_CONST,
                                    TrashConst.PARSER.LOAD_NAME,
                                    TrashConst.PARSER.RETURN_VALUE,
                                ];
                                const frame = last_frame || root_frame;
                                const prev_instr_a =
                                    stack.instructions[index - 2];
                                const prev_instr_b =
                                    stack.instructions[index - 1];
                                if (
                                    prev_instr_a &&
                                    allowed_types.indexOf(prev_instr_a[0]) ===
                                        -1 &&
                                    prev_instr_b &&
                                    allowed_types.indexOf(prev_instr_b[0]) ===
                                        -1
                                ) {
                                    return reject(
                                        `Token '${token.value}' not expected at ${token.start}:${token.end}`
                                    );
                                }
                                const valB = frame.values.pop();
                                const valA = frame.values.pop();
                                frame.values.push(valA + valB);
                            }
                            break;
                        case TrashConst.PARSER.CALL_FUNCTION_SILENT:
                        case TrashConst.PARSER.CALL_FUNCTION:
                            {
                                const frame = frames.pop();
                                try {
                                    // Subframes are executed in silent mode
                                    const ret = await this._callFunction(
                                        frame,
                                        parse_info,
                                        type ===
                                            TrashConst.PARSER
                                                .CALL_FUNCTION_SILENT ||
                                            options?.silent
                                    );
                                    last_frame = frames.at(-1);
                                    if (last_frame) {
                                        last_frame.values.push(ret);
                                    } else {
                                        root_frame.values.push(ret);
                                    }
                                } catch (err) {
                                    return reject(err);
                                }
                            }
                            break;
                        case TrashConst.PARSER.RETURN_VALUE:
                            {
                                const frame = last_frame || root_frame;
                                return_values.push(frame.values.at(-1));
                            }
                            break;
                        case TrashConst.PARSER.STORE_NAME:
                            {
                                const frame = last_frame || root_frame;
                                const vname = stack.names.shift();
                                const vvalue = frame.values.pop();
                                if (!vname) {
                                    if (!token) {
                                        return reject("Invalid instruction!");
                                    }
                                    return reject(
                                        `Invalid name '${token.value}' at ${token.start}:${token.end}`
                                    );
                                } else if (typeof vvalue === "undefined") {
                                    const value_instr =
                                        stack.instructions[index - 1];
                                    const value_token =
                                        stack.inputTokens[value_instr[1]] || {};
                                    return reject(
                                        `Invalid token '${value_token.value}' at ${value_token.start}:${value_token.end}`
                                    );
                                }
                                frame.store[vname] = vvalue;
                            }
                            break;
                        case TrashConst.PARSER.STORE_SUBSCR:
                            {
                                const frame = last_frame || root_frame;
                                const vname = stack.names.shift();
                                const attr_value = frame.values.pop();
                                const attr_name = frame.values.pop();
                                const data = frame.values.pop();
                                try {
                                    data[attr_name] = attr_value;
                                    frame.store[vname] = data;
                                } catch (err) {
                                    return reject(err);
                                }
                            }
                            break;
                        case TrashConst.PARSER.LOAD_DATA_ATTR:
                            {
                                const frame = last_frame || root_frame;
                                const attr_name = frame.values.pop();
                                const index_value = frame.values.length - 1;
                                let value = frame.values[index_value];
                                if (typeof value === "undefined") {
                                    return reject(
                                        `Cannot read properties of undefined (reading '${attr_name}')`
                                    );
                                } else if (
                                    _.isNaN(Number(attr_name)) &&
                                    value.constructor === Array
                                ) {
                                    value = _.pluck(value, attr_name).join(",");
                                } else {
                                    value = value[attr_name];
                                }
                                frame.values[index_value] = value;
                            }
                            break;
                        case TrashConst.PARSER.BUILD_LIST:
                            {
                                const frame = last_frame || root_frame;
                                const iter_count = aindex;
                                const value = [];
                                for (let i = 0; i < iter_count; ++i) {
                                    value.push(frame.values.pop());
                                }
                                frame.values.push(value.reverse());
                            }
                            break;
                        case TrashConst.PARSER.BUILD_MAP:
                            {
                                const frame = last_frame || root_frame;
                                const iter_count = aindex / 2;
                                const value = {};
                                for (let i = 0; i < iter_count; ++i) {
                                    const val = frame.values.pop();
                                    const key = frame.values.pop();
                                    value[key] = val;
                                }
                                frame.values.push(value);
                            }
                            break;
                    }
                }
                _.extend(this._registeredNames, root_frame.store);
                return resolve(return_values);
            });
        },

        getHumanType: function (type) {
            const entries = Object.entries(TrashConst.PARSER);
            for (const entry of entries) {
                if (entry[1] === type) {
                    return entry[0];
                }
            }
            return "";
        },
    });

    return VMachine;
});
