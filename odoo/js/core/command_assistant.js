// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.CommandAssistant", function (require) {
    "use strict";

    const Class = require("web.Class");
    const mixins = require("web.mixins");
    const TrashConst = require("terminal.core.trash.const");

    const CommandAssistant = Class.extend(mixins.ParentedMixin, {
        init: function (parent) {
            this.setParent(parent);
            this._virtMachine = parent._virtMachine;
            this._registeredCmds = parent._registeredCmds;
            this.lazyGetAvailableOptions = _.debounce(
                this._getAvailableOptions,
                175
            );
        },

        _getAvailableCommandNames: function (name) {
            const cmd_names = Object.keys(this._registeredCmds);
            return _.filter(cmd_names, (cmd_name) => cmd_name.startsWith(name));
        },

        _getAvailableArguments: function (command_info, arg_name) {
            const arg_infos = [];
            for (const arg of command_info.args) {
                const arg_info = this._virtMachine
                    .getInterpreter()
                    .getArgumentInfo(arg);
                if (!arg_name || arg_info.names.long.startsWith(arg_name)) {
                    arg_infos.push(arg_info);
                }
            }
            return arg_infos;
        },

        _getAvailableParameters: function (command_info, arg_name, arg_value) {
            const arg_info = this._virtMachine
                .getInterpreter()
                .getArgumentInfoByName(command_info.args, arg_name);

            const res_param_infos = [];
            if (!_.isEmpty(arg_info)) {
                if (!_.isEmpty(arg_info.strict_values)) {
                    const def_value = arg_info.default_value;
                    for (const strict_value of arg_info.strict_values) {
                        if (
                            !arg_value ||
                            String(strict_value).startsWith(arg_value)
                        ) {
                            res_param_infos.push({
                                value: strict_value,
                                is_required: arg_info.is_required,
                                is_default: strict_value === def_value,
                            });
                        }
                    }
                } else if (
                    arg_info.default_value &&
                    String(arg_info.default_value).startsWith(arg_value)
                ) {
                    res_param_infos.push({
                        value: arg_info.default_value,
                        is_default: true,
                        is_required: arg_info.is_required,
                    });
                }
            }

            return res_param_infos;
        },

        getSelectedParameterIndex: function (parse_info, caret_pos) {
            const stack = parse_info.stack;
            if (!stack.instructions.length) {
                return [-1, -1];
            }
            let sel_token_index = -1;
            let sel_cmd_index = -1;
            let sel_arg_index = -1;
            let end_i = -1;
            const instr_count = stack.instructions.length;
            // Found selected token and EOC/EOL
            for (let index = 0; index < instr_count; ++index) {
                const instr = stack.instructions[index];
                if (instr.level > 0) {
                    continue;
                }
                const token =
                    parse_info.inputTokens[instr.level][instr.inputTokenIndex];
                if (!token) {
                    continue;
                }
                if (caret_pos >= token.start && caret_pos <= token.end) {
                    sel_token_index = instr.inputTokenIndex;
                    end_i = index;
                }
            }
            for (let cindex = end_i; cindex >= 0; --cindex) {
                const instr = stack.instructions[cindex];
                if (instr.level > 0) {
                    continue;
                }
                const token =
                    parse_info.inputTokens[instr.level][instr.inputTokenIndex];
                if (!token) {
                    continue;
                }
                if (
                    sel_arg_index === -1 &&
                    instr.type === TrashConst.PARSER.LOAD_ARG
                ) {
                    sel_arg_index = instr.inputTokenIndex;
                    continue;
                }
                if (
                    sel_token_index !== -1 &&
                    instr.type === TrashConst.PARSER.LOAD_GLOBAL
                ) {
                    sel_cmd_index = instr.inputTokenIndex;
                    break;
                }
            }
            return [sel_cmd_index, sel_token_index, sel_arg_index];
        },

        _getAvailableOptions: function (data, caret_pos, callback) {
            if (_.isEmpty(data)) {
                callback([]);
                return;
            }
            const parse_info = this._virtMachine.getInterpreter().parse(data, {
                needResetStores: false,
                registeredCmds: this._registeredCmds,
            });
            const ret = [];
            const [sel_cmd_index, sel_token_index, sel_arg_index] =
                this.getSelectedParameterIndex(parse_info, caret_pos);
            const cmd_token = parse_info.inputTokens[0][sel_cmd_index];
            const cur_token = parse_info.inputTokens[0][sel_token_index];
            const arg_token = parse_info.inputTokens[0][sel_arg_index];
            if (cur_token === cmd_token) {
                // Command name
                const cmd_names = this._getAvailableCommandNames(
                    cmd_token?.value || data
                );
                for (const cmd_name of cmd_names) {
                    ret.push({
                        name: cmd_name,
                        string: cmd_name,
                        is_command: true,
                    });
                }
                callback(ret);
                return;
            }

            const command_info = cmd_token
                ? this._registeredCmds[cmd_token.value]
                : undefined;
            if (!command_info || cur_token === -1) {
                callback([]);
                return;
            }
            if (sel_token_index === sel_arg_index) {
                // Argument
                const arg_infos = this._getAvailableArguments(
                    command_info,
                    arg_token.value
                );
                for (const arg_info of arg_infos) {
                    ret.push({
                        name: `-${arg_info.names.short}, --${arg_info.names.long}`,
                        string: `--${arg_info.names.long}`,
                        is_argument: true,
                        is_required: arg_info.is_required,
                    });
                }
            } else if (sel_token_index !== sel_cmd_index && arg_token) {
                // Parameter
                const param_infos = this._getAvailableParameters(
                    command_info,
                    arg_token.value,
                    cur_token.value
                );
                for (const param_info of param_infos) {
                    ret.push({
                        name: param_info.value,
                        string: param_info.value,
                        is_paramater: true,
                        is_default: param_info.is_default,
                        is_required: param_info.is_required,
                    });
                }
            }

            callback(ret);
        },
    });

    return CommandAssistant;
});
