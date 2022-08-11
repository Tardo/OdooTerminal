// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.CommandAssistant", function (require) {
    "use strict";

    const Class = require("web.Class");
    const mixins = require("web.mixins");

    const CommandAssistant = Class.extend(mixins.ParentedMixin, {
        init: function (parent) {
            this.setParent(parent);
            this._parameterReader = parent._parameterReader;
            this._registeredCmds = parent._registeredCmds;
        },

        _getAvailableCommandNames: function (scmd) {
            const cmd_names = Object.keys(this._registeredCmds);
            return _.filter(cmd_names, (cmd_name) =>
                cmd_name.startsWith(scmd.cmd)
            );
        },

        _getAvailableArguments: function (scmd, arg_name) {
            const cmd_def = this._registeredCmds[scmd.cmd];
            const s_arg_name =
                arg_name && arg_name.substr(arg_name[1] === "-" ? 2 : 1);
            const arg_infos = [];
            for (const arg of cmd_def.args) {
                const arg_info = this._parameterReader.getArgumentInfo(arg);
                if (!s_arg_name || arg_info.names.long.startsWith(s_arg_name)) {
                    arg_infos.push(arg_info);
                }
            }
            return arg_infos;
        },

        _getAvailableParameters: function (scmd, sel_param_index, param) {
            const cmd_def = this._registeredCmds[scmd.cmd];
            const prev_param =
                sel_param_index > 0 && scmd.params[sel_param_index - 1];
            let arg_info = false;
            if (!prev_param || prev_param[0] !== "-") {
                // Its a unnamed parameter
                const arg = cmd_def.args[sel_param_index];
                arg_info = arg && this._parameterReader.getArgumentInfo(arg);
            } else if (prev_param[0] === "-" && prev_param.length > 1) {
                // Its a named parameter
                arg_info = this._parameterReader.getArgumentInfoByName(
                    cmd_def.args,
                    prev_param.substr(prev_param[1] === "-" ? 2 : 1)
                );
            }

            const res_param_infos = [];
            if (!_.isEmpty(arg_info)) {
                if (!_.isEmpty(arg_info.strict_values)) {
                    const def_value = arg_info.default_value;
                    for (const strict_value of arg_info.strict_values) {
                        if (!param || String(strict_value).startsWith(param)) {
                            res_param_infos.push({
                                value: strict_value,
                                is_required: arg_info.is_required,
                                is_default: strict_value === def_value,
                            });
                        }
                    }
                } else if (
                    arg_info.default_value &&
                    String(arg_info.default_value).startsWith(param)
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

        getSelectedParameterIndex: function (scmd, caret_pos) {
            let sel_param_index = null;
            if (caret_pos <= scmd.cmd.length) {
                sel_param_index = -1;
            } else if (caret_pos > scmd.cmdRaw.trim().length) {
                sel_param_index = scmd.params.length;
            } else {
                let offset = scmd.cmd.length + 1;
                for (const index_param in scmd.params) {
                    const params_len =
                        scmd.params[index_param].length +
                        (scmd.params[index_param].indexOf(" ") === -1 ? 0 : 2);
                    if (
                        caret_pos >= offset &&
                        caret_pos <= offset + params_len
                    ) {
                        sel_param_index = index_param;
                    }
                    // +1 because space
                    offset += params_len + 1;
                }
            }

            return sel_param_index;
        },

        getAvailableOptions: function (cmd_raw, caret_pos) {
            if (_.isEmpty(cmd_raw)) {
                return [];
            }
            const scmd = this._parameterReader.parse(cmd_raw);
            const sel_param_index = this.getSelectedParameterIndex(
                scmd,
                caret_pos
            );
            const options = [];

            if (sel_param_index === -1) {
                // Its a command name
                const cmd_names = this._getAvailableCommandNames(scmd);
                for (const cmd_name of cmd_names) {
                    options.push({
                        name: cmd_name,
                        string: cmd_name,
                        is_command: true,
                    });
                }
            } else if (Object.hasOwn(this._registeredCmds, scmd.cmd)) {
                const param = scmd.params[sel_param_index];
                if ((param && param[0] === "-") || sel_param_index === 0) {
                    // Its a argument
                    const arg_infos = this._getAvailableArguments(scmd, param);
                    for (const arg_info of arg_infos) {
                        options.push({
                            name: `-${arg_info.names.short}, --${arg_info.names.long}`,
                            string: `--${arg_info.names.long}`,
                            is_argument: true,
                            is_required: arg_info.is_required,
                        });
                    }
                } else {
                    // Its a parameter
                    const param_infos = this._getAvailableParameters(
                        scmd,
                        sel_param_index,
                        param
                    );
                    for (const param_info of param_infos) {
                        options.push({
                            name: param_info.value,
                            string: param_info.value,
                            is_paramater: true,
                            is_default: param_info.is_default,
                            is_required: param_info.is_required,
                        });
                    }
                }
            }

            return options;
        },
    });

    return CommandAssistant;
});
