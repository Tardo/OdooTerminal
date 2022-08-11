// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.ParameterReader", function (require) {
    "use strict";

    const ParameterGenerator = require("terminal.core.ParameterGenerator");
    const Utils = require("terminal.core.Utils");
    const Class = require("web.Class");
    const core = require("web.core");

    const _t = core._t;

    /**
     * This class is used to parse terminal command parameters.
     */
    const ParameterReader = Class.extend({
        init: function () {
            this._validators = {
                s: this._validateString.bind(this),
                i: this._validateInt.bind(this),
                j: this._validateJson.bind(this),
                f: this._validateInt.bind(this),
                a: this._valideAlphanumeric.bind(this),
            };
            this._formatters = {
                s: this._formatString.bind(this),
                i: this._formatInt.bind(this),
                j: this._formatJson.bind(this),
                f: this._formatFlag.bind(this),
                a: this._formatAlphanumeric.bind(this),
            };
            this._regexSanitize = new RegExp(/(?<!\\)'/g);
            this._regexParams = new RegExp(
                /(\\?["'`])(?:(?=(\\?))\2.)*?\1|[^\s]+/g
            );
            this._regexArgs = new RegExp(/[l?*]/);
            this._regexRunner = new RegExp(
                /[=]=\{(.+?)\}(?:\.(\w+)|\[(\d+)\])?/gm
            );
            this._regexSimpleJSON = new RegExp(
                /([^=\s]*)\s?=\s?(\\?["'`])(?:(?=(\\?))\3.)*?\2|([^=\s]*)\s?=\s?([^\s]+)/g
            );
            this._parameterGenerator = new ParameterGenerator();
        },

        /**
         * Split and trim values
         * @param {String} text
         * @param {String} separator
         * @returns {Array}
         */
        splitAndTrim: function (text, separator = ",") {
            return _.map(text.split(separator), (item) => item.trim());
        },

        /**
         * Resolve argument information
         *
         * @param {String} arg
         * @returns {Object}
         */
        getArgumentInfo: function (arg) {
            const [
                type,
                names,
                is_required,
                descr,
                default_value,
                strict_values,
            ] = arg.split("::");
            const [short_name, long_name] = names.split(":");
            const list_mode = type[0] === "l";
            let ttype = type.at(-1);
            if (ttype === "-") {
                ttype = "s";
            }
            const s_strict_values = strict_values?.replaceAll(":", ",");
            return {
                type: type,
                names: {
                    short: short_name,
                    long: long_name,
                },
                description: descr,
                default_value:
                    (!_.isEmpty(default_value) &&
                        this._formatters[ttype](default_value, list_mode)) ||
                    undefined,
                strict_values:
                    (!_.isEmpty(s_strict_values) &&
                        this._formatters[ttype](s_strict_values, true)) ||
                    undefined,
                is_required: Boolean(Number(is_required)),
                list_mode: list_mode,
            };
        },

        /**
         * @param {Array} args
         * @param {String} arg_name
         * @returns {Object}
         */
        getArgumentInfoByName: function (args, arg_name) {
            for (const arg of args) {
                const arg_info = this.getArgumentInfo(arg);
                if (
                    arg_info.names.short === arg_name ||
                    arg_info.names.long === arg_name
                ) {
                    return arg_info;
                }
            }

            return null;
        },

        /**
         * @param {String} type
         * @returns {String}
         */
        getHumanType: function (type) {
            const singular_types = ["-", "j"];
            const name_types = {
                i: "NUMBER",
                s: "STRING",
                j: "JSON",
                f: "FLAG",
                a: "ALPHANUMERIC",
                "-": "ANY",
            };
            let res = "";
            let carg = type[0];
            const is_list = carg === "l";
            if (is_list) {
                res += "LIST OF ";
                carg = type[1];
            }
            if (Object.hasOwn(name_types, carg)) {
                res += name_types[carg];
            } else {
                res += "UNKNOWN";
            }
            if (is_list && singular_types.indexOf(carg) === -1) {
                res += "S";
            }
            return res;
        },

        /**
         * Used to resolve "runners"
         *
         * @param {String} cmd_raw
         * @returns {Object}
         */
        preparse: function (cmd_raw) {
            const match = this._regexRunner[Symbol.matchAll](cmd_raw);
            const runners = Array.from(match, (x) => {
                return {
                    cmd: x[1],
                    ext: x[3] || x[2],
                };
            });
            let cc_index = 0;
            const pp_cmd = cmd_raw.replaceAll(
                this._regexRunner,
                () => `=={${cc_index++}}`
            );
            return {
                cmd: pp_cmd,
                runners: runners,
            };
        },

        /**
         * Sanitize command parameters to use when invoke commands.
         * @param {String} cmd_raw
         * @param {Object} cmd_def
         * @returns {Object}
         */
        parse: function (cmd_raw, cmd_def = {}) {
            const match = this._regexParams[Symbol.matchAll](cmd_raw);
            let scmd = Array.from(match, (x) => x[0]);
            const cmd = scmd[0];
            scmd = scmd.slice(1);
            let params = _.map(scmd, (item) => {
                let nvalue = this._trimQuotes(item);
                nvalue = cmd_def.sanitized
                    ? this._sanitizeString(nvalue)
                    : nvalue;
                return Utils.unescapeQuotes(nvalue);
            });

            if (cmd_def.generators) {
                params = this._parameterGenerator.parse(params);
            }
            params = this.validateAndFormat(cmd_def.args, params);

            return {
                cmd: cmd,
                cmdRaw: cmd_raw,
                params: params,
            };
        },

        /**
         * Check if the parameter type correspond with the expected type.
         * @param {Array} args
         * @param {Array} params
         * @returns {Boolean}
         */
        validateAndFormat: function (args, params) {
            if (_.isEmpty(args)) {
                return params;
            }
            const checked_args = [];
            const checked_args_required = [];
            let kwargs = {};

            // Create arguments dict
            for (let i = 0; i < params.length; ++i) {
                const checked_args_count = checked_args.length;
                if (checked_args_count >= args.length) {
                    throw _t(
                        "Invalid command parameters: More arguments are being passed than the command accepts"
                    );
                }
                let param = params[i];

                // Get argument info
                // If not named param given the position will be used
                // against "required arguments".
                let arg_info = null;
                if (param[0] === "-") {
                    const arg_name = param.substr(param[1] === "-" ? 2 : 1);
                    arg_info = this.getArgumentInfoByName(args, arg_name);
                    if (_.isEmpty(arg_info)) {
                        throw _t(
                            `The argument '${args[checked_args_count]}' does not exist`
                        );
                    }
                    // Handle 'flag' type, so it don't use a value
                    if (arg_info.type === "f") {
                        kwargs[arg_info.names.long.replaceAll("-", "_")] = true;
                        continue;
                    }
                    param = params[++i];
                } else {
                    arg_info = this.getArgumentInfo(args[checked_args_count]);
                    if (_.isEmpty(arg_info)) {
                        throw _t(
                            `The argument '${args[checked_args_count]}' does not exist`
                        );
                    }
                }

                const arg_long_name = arg_info.names.long;
                const s_arg_long_name = arg_long_name.replaceAll("-", "_");

                let carg = arg_info.type[0];
                // Determine argument type (modifiers)
                if (carg === "l") {
                    carg = arg_info.type[1];
                }

                if (carg === "-") {
                    const formatted_param = this._tryAllFormatters(
                        param,
                        arg_info.list_mode
                    );
                    if (!_.isNull(formatted_param)) {
                        kwargs[s_arg_long_name] = formatted_param;
                        checked_args.push(s_arg_long_name);
                        if (arg_info.is_required) {
                            checked_args_required.push(s_arg_long_name);
                        }
                        continue;
                    }

                    // Not found any compatible formatter
                    // fallback to generic string
                    carg = "s";
                } else if (!this._validators[carg](param, arg_info.list_mode)) {
                    throw _t(
                        `Invalid parameter for '${arg_long_name}' argument: '${param}'`
                    );
                }
                kwargs[s_arg_long_name] = this._formatters[carg](
                    param,
                    arg_info.list_mode
                );
                if (!_.isEmpty(arg_info.strict_values)) {
                    if (
                        arg_info.strict_values.indexOf(
                            kwargs[s_arg_long_name]
                        ) === -1
                    ) {
                        throw _t(
                            `Invalid parameter for '${arg_long_name}' argument: '${param}' (Only ${arg_info.strict_values.join(
                                ","
                            )} is allowed)`
                        );
                    }
                }
                checked_args.push(s_arg_long_name);
                if (arg_info.is_required) {
                    checked_args_required.push(s_arg_long_name);
                }
            }

            // Check that all is correct
            this._assertParams(
                args,
                params,
                checked_args,
                checked_args_required
            );

            // Apply default values
            let default_values = _.chain(args)
                .map((x) => this.getArgumentInfo(x))
                .filter((x) => typeof x.default_value !== "undefined")
                .map((x) => [x.names.long, x.default_value])
                .value();
            default_values = _.isEmpty(default_values)
                ? {}
                : Object.fromEntries(default_values);
            kwargs = _.extend({}, default_values, kwargs);
            return kwargs;
        },

        /**
         * Free internal stores
         */
        resetStores: function () {
            this._parameterGenerator.resetStores();
        },

        /**
         * Check that the parameters match the expected number.
         *
         *
         * @param {String} args
         * @param {Array} params
         * @param {Array} checked_args
         * @param {Array} checked_args_required
         */
        _assertParams: function (
            args,
            params,
            checked_args,
            checked_args_required
        ) {
            const normalized_arg_names = _.chain(args)
                .map((x) => this.getArgumentInfo(x)?.names.long)
                .value();
            const required_args = _.chain(args)
                .filter((x) => this.getArgumentInfo(x)?.is_required)
                .map((x) => this.getArgumentInfo(x)?.names.long)
                .value();
            const param_values = _.filter(params, (x) => x[0] !== "-");
            const param_values_count = param_values.length;
            const checked_args_count = checked_args.length;
            const checked_required_args_count = checked_args_required.length;
            if (checked_args_count < param_values_count) {
                const args_diff = _.difference(
                    normalized_arg_names,
                    checked_args
                );
                throw _t(
                    `Invalid command parameters: Lack of parameters (${args_diff.join(
                        ","
                    )})`
                );
            } else if (checked_args_count > param_values_count) {
                const args_diff = _.difference(
                    checked_args,
                    normalized_arg_names
                );
                throw _t(
                    `Invalid command parameters: Too many parameters (${args_diff.join(
                        ","
                    )})`
                );
            } else if (checked_required_args_count < required_args.length) {
                const normalized_arg_names_required = _.chain(args)
                    .map((x) => {
                        const args_info = this.getArgumentInfo(x);
                        return args_info?.is_required && args_info?.names.long;
                    })
                    .filter((x) => x)
                    .value();
                const args_diff = _.difference(
                    normalized_arg_names_required,
                    checked_args_required
                );
                throw _t(
                    `Invalid command parameters: Required arguments missing (${args_diff.join(
                        ","
                    )})`
                );
            }
        },

        _tryAllFormatters: function (param, list_mode) {
            // Try all possible validators/formatters
            let formatted_param = null;
            for (const key in this._validators) {
                if (key === "s") {
                    continue;
                }
                if (this._validators[key](param, list_mode)) {
                    formatted_param = this._formatters[key](param, list_mode);
                    break;
                }
            }

            return formatted_param;
        },

        /**
         * Get the number of required arguments
         * @param {String} args
         * @returns {Int}
         */
        _getNumRequiredArgs: function (args) {
            const match = args.match(this._regexArgs);
            return match ? match.index : args.length;
        },

        /**
         * Replace all quotes to double-quotes.
         * @param {String} str
         * @returns {String}
         */
        _sanitizeString: function (str) {
            return str.replaceAll(this._regexSanitize, '"');
        },

        /**
         * @param {String} str
         * @returns {String}
         */
        _trimQuotes: function (str) {
            const first_char = str[0];
            const last_char = str.at(-1);
            if (
                (first_char === '"' && last_char === '"') ||
                (first_char === "'" && last_char === "'") ||
                (first_char === "`" && last_char === "`")
            ) {
                return str.substring(1, str.length - 1);
            }
            return str;
        },

        /**
         * Try to convert input to json.
         * This is used to parse "simple json"
         * Input:
         *      "name=Test street='The Street'"
         * Output:
         *      {'name': 'Test', 'street': 'The Street'}
         *
         * @param {String} str
         * @returns {String}
         */
        _simple2JSON: function (str) {
            let params = {};
            // Check if is a valid simple format string
            try {
                return JSON.parse(str);
            } catch (err) {
                params = str.match(this._regexSimpleJSON);
                if (str[0] === "[" || str[0] === "{" || _.isEmpty(params)) {
                    throw err;
                }
            }
            const obj = {};
            for (const param of params) {
                let [param_name, ...param_value] = param.trim().split("=");
                param_value = Utils.unescapeQuotes(
                    this._trimQuotes(param_value.join("="))
                );
                const formatted_param = this._tryAllFormatters(param_value);
                obj[param_name] = formatted_param || param_value;
            }
            return obj;
        },

        /**
         * Test if is an string.
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Boolean}
         */
        _validateString: function (param, list_mode = false) {
            if (list_mode) {
                const param_split = param.split(",");
                let is_valid = true;
                const param_split_len = param_split.length;
                let index = 0;
                while (index < param_split_len) {
                    const ps = param_split[index];
                    const param_sa = ps.trim();
                    if (Number(param_sa) === parseInt(param_sa, 10)) {
                        is_valid = false;
                        break;
                    }
                    ++index;
                }
                return is_valid;
            }
            return Number(param) !== parseInt(param, 10);
        },

        /**
         * Test if is an integer.
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Boolean}
         */
        _validateInt: function (param, list_mode = false) {
            if (list_mode) {
                const param_split = param.split(",");
                let is_valid = true;
                const param_split_len = param_split.length;
                let index = 0;
                while (index < param_split_len) {
                    const ps = param_split[index];
                    const param_sa = ps.trim();
                    if (Number(param_sa) !== parseInt(param_sa, 10)) {
                        is_valid = false;
                        break;
                    }
                    ++index;
                }
                return is_valid;
            }
            return Number(param) === parseInt(param, 10);
        },

        /**
         * Test if is an alphanumeric.
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Boolean}
         */
        _valideAlphanumeric: function (param, list_mode = false) {
            return (
                this._validateInt(param, list_mode) ||
                this._validateString(param, list_mode)
            );
        },

        /**
         * Test if is a valid json.
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Boolean}
         */
        _validateJson: function (param, list_mode = false) {
            if (list_mode) {
                const param_split = param.split(",");
                let is_valid = true;
                const param_split_len = param_split.length;
                let index = 0;
                while (index < param_split_len) {
                    const ps = param_split[index];
                    const param_sa = ps.trim();

                    try {
                        this._simple2JSON(param_sa);
                    } catch (err) {
                        is_valid = false;
                        break;
                    }
                    ++index;
                }
                return is_valid;
            }

            try {
                this._simple2JSON(param.trim());
            } catch (err) {
                return false;
            }
            return true;
        },

        /**
         * Format value to string
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {String}
         */
        _formatString: function (param, list_mode = false) {
            if (list_mode) {
                return this.splitAndTrim(param);
            }
            return param;
        },

        /**
         * Format value to integer
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Number}
         */
        _formatInt: function (param, list_mode = false) {
            if (list_mode) {
                return _.map(this.splitAndTrim(param), (item) => Number(item));
            }
            return Number(param);
        },

        /**
         * Format value to string
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Number}
         */
        _formatAlphanumeric: function (param, list_mode = false) {
            return this._formatString(param, list_mode);
        },

        /**
         * Format value to js object
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Number}
         */
        _formatJson: function (param, list_mode = false) {
            if (list_mode) {
                return _.map(this.splitAndTrim(param), (item) =>
                    this._simple2JSON(item)
                );
            }
            return this._simple2JSON(param.trim());
        },

        /**
         * Format value to boolean
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Number}
         */
        _formatFlag: function (param, list_mode = false) {
            if (list_mode) {
                return _.map(this.splitAndTrim(param), (item) =>
                    Boolean(Number(item))
                );
            }
            return Boolean(Number(param.trim()));
        },
    });

    return ParameterReader;
});
