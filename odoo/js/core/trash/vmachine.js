// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.trash.vmachine", function (require) {
    "use strict";

    const TrashConst = require("terminal.core.trash.const");
    const Interpreter = require("terminal.core.trash.interpreter");
    const Exceptions = require("terminal.core.trash.exception");
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
                        return reject(
                            new Exceptions.InvalidCommandArgumentsError(
                                frame.cmd,
                                frame.args
                            )
                        );
                    }
                    let kwargs = {};
                    const values = frame.values;
                    for (let index = items_len - 1; index >= 0; --index) {
                        let arg_name = frame.args.pop();
                        if (!arg_name) {
                            const arg_def = cmd_def.args[index];
                            if (!arg_def) {
                                return reject(
                                    new Exceptions.InvalidCommandArgumentValueError(
                                        frame.cmd,
                                        values[index]
                                    )
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
                        return reject(
                            new Exceptions.InvalidCommandArgumentFormatError(
                                err,
                                frame.cmd
                            )
                        );
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

        _checkGlobalName: function (global_name) {
            return (
                Object.hasOwn(this._registeredCmds, global_name) ||
                this.getInterpreter().getAliasCommand(global_name)
            );
        },

        eval: function (cmd_raw, options) {
            if (cmd_raw.constructor !== String) {
                return Promise.reject("Invalid input!");
            }
            options = _.defaults(options, {
                needResetStores: true,
            });
            return new Promise(async (resolve, reject) => {
                const parse_info = this.interpreter.parse(cmd_raw, {
                    registeredCmds: this._registeredCmds,
                    registeredNames: this._registeredNames,
                    needResetStores: options?.needResetStores,
                    isData: options?.isData,
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
                        case TrashConst.INSTRUCTION_TYPE.LOAD_NAME:
                            {
                                const var_name =
                                    stack.names[instr.level][instr.dataIndex];

                                // Check stores
                                const frame = last_frame || root_frame;
                                if (
                                    last_frame &&
                                    Object.hasOwn(last_frame.store, var_name)
                                ) {
                                    frame.values.push(
                                        last_frame.store[var_name]
                                    );
                                } else if (
                                    Object.hasOwn(root_frame.store, var_name)
                                ) {
                                    frame.values.push(
                                        root_frame.store[var_name]
                                    );
                                } else if (
                                    Object.hasOwn(
                                        this._registeredNames,
                                        var_name
                                    )
                                ) {
                                    frame.values.push(
                                        this._registeredNames[var_name]
                                    );
                                } else {
                                    return reject(
                                        new Exceptions.UnknownNameError(
                                            var_name,
                                            token.start,
                                            token.end
                                        )
                                    );
                                }
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.LOAD_GLOBAL:
                            {
                                const cmd_name =
                                    stack.names[instr.level][instr.dataIndex];
                                if (this._checkGlobalName(cmd_name)) {
                                    last_frame = new Frame(
                                        cmd_name,
                                        last_frame
                                    );
                                    frames.push(last_frame);
                                } else {
                                    return reject(
                                        new Exceptions.UnknownCommandError(
                                            cmd_name,
                                            token.start,
                                            token.end
                                        )
                                    );
                                }
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.LOAD_CONST:
                            {
                                const frame = last_frame || root_frame;
                                const value =
                                    stack.values[instr.level][instr.dataIndex];
                                frame.values.push(value);
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.LOAD_ARG:
                            {
                                const arg =
                                    stack.arguments[instr.level][
                                        instr.dataIndex
                                    ];
                                if (!last_frame) {
                                    return reject(
                                        new Exceptions.NotExpectedCommandArgumentError(
                                            arg,
                                            token.start,
                                            token.end
                                        )
                                    );
                                }
                                // Flag arguments can be implicit
                                const next_instr =
                                    stack.instructions[index + 1];
                                if (
                                    next_instr &&
                                    next_instr.type >
                                        TrashConst.INSTRUCTION_TYPE.LOAD_CONST
                                ) {
                                    last_frame.values.push(true);
                                }
                                last_frame.args.push(arg);
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.CONCAT:
                            {
                                const frame = last_frame || root_frame;
                                const valB = frame.values.pop();
                                const valA = frame.values.pop();
                                frame.values.push(`${valA}${valB}`);
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.ADD:
                        case TrashConst.INSTRUCTION_TYPE.SUBSTRACT:
                        case TrashConst.INSTRUCTION_TYPE.MULTIPLY:
                        case TrashConst.INSTRUCTION_TYPE.DIVIDE:
                        case TrashConst.INSTRUCTION_TYPE.MODULO:
                        case TrashConst.INSTRUCTION_TYPE.POW:
                            {
                                const frame = last_frame || root_frame;
                                const valB = frame.values.pop();
                                const valA = frame.values.pop();
                                if (
                                    instr.type ===
                                    TrashConst.INSTRUCTION_TYPE.ADD
                                ) {
                                    frame.values.push(valA + valB);
                                } else if (
                                    instr.type ===
                                    TrashConst.INSTRUCTION_TYPE.SUBSTRACT
                                ) {
                                    frame.values.push(valA - valB);
                                } else if (
                                    instr.type ===
                                    TrashConst.INSTRUCTION_TYPE.MULTIPLY
                                ) {
                                    frame.values.push(valA * valB);
                                } else if (
                                    instr.type ===
                                    TrashConst.INSTRUCTION_TYPE.DIVIDE
                                ) {
                                    frame.values.push(valA / valB);
                                } else if (
                                    instr.type ===
                                    TrashConst.INSTRUCTION_TYPE.MODULO
                                ) {
                                    frame.values.push(valA % valB);
                                } else if (
                                    instr.type ===
                                    TrashConst.INSTRUCTION_TYPE.POW
                                ) {
                                    frame.values.push(Math.pow(valA, valB));
                                }
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.CALL_FUNCTION_SILENT:
                        case TrashConst.INSTRUCTION_TYPE.CALL_FUNCTION:
                            {
                                const frame = frames.pop();
                                try {
                                    // Subframes are executed in silent mode
                                    const ret = await this._callFunction(
                                        frame,
                                        parse_info,
                                        instr.type ===
                                            TrashConst.INSTRUCTION_TYPE
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
                                    return reject(
                                        new Exceptions.CallFunctionError(err)
                                    );
                                }
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.RETURN_VALUE:
                            {
                                const frame = last_frame || root_frame;
                                return_values.push(frame.values.at(-1));
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.STORE_NAME:
                            {
                                const frame = last_frame || root_frame;
                                const vname =
                                    stack.names[instr.level][instr.dataIndex];
                                const vvalue = frame.values.pop();
                                if (!vname) {
                                    if (!token) {
                                        return reject(
                                            new Exceptions.InvalidInstructionError()
                                        );
                                    }
                                    return reject(
                                        new Exceptions.InvalidNameError(
                                            token.value,
                                            token.start,
                                            token.end
                                        )
                                    );
                                } else if (typeof vvalue === "undefined") {
                                    const value_instr =
                                        stack.instructions[index - 1];
                                    const value_token =
                                        stack.inputTokens[
                                            value_instr.inputTokenIndex
                                        ] || {};
                                    return reject(
                                        new Exceptions.InvalidTokenError(
                                            value_token.value,
                                            value_token.start,
                                            value_token.end
                                        )
                                    );
                                }
                                frame.store[vname] = vvalue;
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.STORE_SUBSCR:
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
                                    return reject(
                                        new Exceptions.InvalidInstructionError(
                                            err
                                        )
                                    );
                                }
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.LOAD_DATA_ATTR:
                            {
                                const frame = last_frame || root_frame;
                                const attr_name = frame.values.pop();
                                const index_value = frame.values.length - 1;
                                const value = frame.values[index_value];

                                if (typeof value === "undefined") {
                                    return reject(
                                        new Exceptions.UndefinedValueError(
                                            attr_name
                                        )
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
                        case TrashConst.INSTRUCTION_TYPE.BUILD_LIST:
                            {
                                const frame = last_frame || root_frame;
                                const iter_count = _.countBy(
                                    stack.instructions,
                                    (item) => {
                                        return (
                                            item.level === instr.dataIndex &&
                                            item.dataIndex !== -1
                                        );
                                    }
                                ).true;
                                const value = [];
                                for (let i = 0; i < iter_count; ++i) {
                                    value.push(frame.values.pop());
                                }
                                frame.values.push(value.reverse());
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.BUILD_MAP:
                            {
                                const frame = last_frame || root_frame;
                                const iter_count =
                                    _.countBy(stack.instructions, (item) => {
                                        return (
                                            item.level === instr.dataIndex &&
                                            item.dataIndex !== -1
                                        );
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
                        case TrashConst.INSTRUCTION_TYPE.PUSH_FRAME:
                            {
                                last_frame = new Frame(undefined, last_frame);
                                frames.push(last_frame);
                            }
                            break;
                        case TrashConst.INSTRUCTION_TYPE.POP_FRAME:
                            {
                                frames.pop();
                                last_frame = frames.at(-1);
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
