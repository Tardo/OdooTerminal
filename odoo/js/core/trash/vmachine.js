// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.TraSH.vmachine", function (require) {
    "use strict";

    const MParser = require("terminal.external.mparser");
    const TrashConst = require("terminal.core.trash.const");
    const Interpreter = require("terminal.core.TraSH.interpreter");
    const TemplateManager = require("terminal.core.TemplateManager");
    const Class = require("web.Class");

    // Const Block = Class.extend({
    //     init: function () {
    //         this.values = [];
    //         this.store = {};
    //     },
    // });

    const Frame = Class.extend({
        init: function (cmd_name, prev_frame) {
            this.cmd = cmd_name;
            // This.blocks = [];
            this.store = {};
            this.args = [];
            this.values = [];
            this.prevFrame = prev_frame;

            if (this.prevFrame) {
                this.store = _.clone(this.prevFrame.store);
            }
        },
    });

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
            if (cmd_raw.constructor !== String) {
                return Promise.reject("Invalid input!");
            }
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
                const root_frame = new Frame();
                root_frame.store = this._registeredNames;
                const frames = [];
                const return_values = [];
                let last_frame = root_frame;
                for (let index = 0; index < stack_instr_len; ++index) {
                    const instr = stack.instructions[index];
                    const token =
                        instr.inputTokenIndex >= 0
                            ? parse_info.inputTokens[instr.level][
                                  instr.inputTokenIndex
                              ]
                            : null;
                    switch (instr.type) {
                        case TrashConst.PARSER.LOAD_NAME:
                            {
                                const cmd_name =
                                    stack.names[instr.level][instr.dataIndex];

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
                                const cmd_name =
                                    stack.names[instr.level][instr.dataIndex];
                                if (
                                    Object.hasOwn(
                                        this._registeredCmds,
                                        cmd_name
                                    ) ||
                                    this.getInterpreter().getAliasCommand(
                                        cmd_name
                                    )
                                ) {
                                    last_frame = new Frame(
                                        cmd_name,
                                        last_frame
                                    );
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
                                const value =
                                    stack.values[instr.level][instr.dataIndex];
                                frame.values.push(value);
                            }
                            break;
                        case TrashConst.PARSER.LOAD_ARG:
                            {
                                const arg =
                                    stack.arguments[instr.level][
                                        instr.dataIndex
                                    ];
                                if (!last_frame) {
                                    return reject(
                                        `Argument '${arg}' not expected at ${token.start}:${token.end}`
                                    );
                                }
                                // Flag arguments can be implicit
                                const next_instr =
                                    stack.instructions[index + 1];
                                if (
                                    next_instr &&
                                    next_instr.type >
                                        TrashConst.PARSER.LOAD_CONST
                                ) {
                                    last_frame.values.push(true);
                                }
                                last_frame.args.push(arg);
                            }
                            break;
                        case TrashConst.PARSER.LOAD_MATH:
                            const frame = last_frame || root_frame;
                            const value =
                                stack.values[instr.level][instr.dataIndex];
                            try {
                                frame.values.push(
                                    await MParser.parse(value).evaluate(this)
                                );
                            } catch (err) {
                                frame.values.push(NaN);
                            }
                            break;
                        case TrashConst.PARSER.ADD:
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
                                    allowed_types.indexOf(prev_instr_a.type) ===
                                        -1 &&
                                    prev_instr_b &&
                                    allowed_types.indexOf(prev_instr_b.type) ===
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
                                        instr.type ===
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
                                const vname =
                                    stack.names[instr.level][instr.dataIndex];
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
                                        stack.inputTokens[
                                            value_instr.inputTokenIndex
                                        ] || {};
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
                                const vname =
                                    stack.names[instr.level][instr.datIndex];
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
                                const value = frame.values[index_value];
                                if (typeof value === "undefined") {
                                    return reject(
                                        `Cannot read properties of undefined (reading '${attr_name}')`
                                    );
                                }
                                let res_value = value[attr_name];
                                if (typeof res_value === "undefined") {
                                    if (
                                        _.isNaN(Number(attr_name)) &&
                                        value.constructor === Array
                                    ) {
                                        res_value = _.pluck(value, attr_name);
                                        if (
                                            _.every(res_value, (item) =>
                                                _.isUndefined(item)
                                            )
                                        ) {
                                            res_value = undefined;
                                        } else {
                                            res_value = res_value.join(",");
                                        }
                                    }
                                }
                                frame.values[index_value] = res_value;
                            }
                            break;
                        case TrashConst.PARSER.BUILD_LIST:
                            {
                                const frame = last_frame || root_frame;
                                const iter_count = _.countBy(
                                    stack.instructions,
                                    {level: instr.dataIndex}
                                ).true;
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
                                const iter_count =
                                    _.countBy(stack.instructions, {
                                        level: instr.dataIndex,
                                    }).true / 2;
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
                return resolve(return_values);
            });
        },
    });

    return VMachine;
});
