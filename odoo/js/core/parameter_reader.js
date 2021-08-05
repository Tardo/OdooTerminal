// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
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
                s: this._validateString,
                i: this._validateInt,
                j: this._validateJson,
            };
            this._formatters = {
                s: this._formatString,
                i: this._formatInt,
                j: this._formatJson,
            };
            this._regexSanitize = new RegExp(/'/g);
            this._regexParams = new RegExp(
                /(["'])(?:(?=(\\?))\2.)*?\1|[^\s]+/g
            );
            this._regexArgs = new RegExp(/[l?*]/);
            this._regexRunner = new RegExp(
                /\{\{(.+?)\}\}(?:\.(\w+)|\[(\d+)\])?/gm
            );
            this._parameterGenerator = new ParameterGenerator();
        },

        /**
         * Split and trim values
         * @param {String} text
         * @param {String} separator
         * @returns {Array}
         */
        splitAndTrim: function (text, separator) {
            return _.map(text.split(separator), (item) => item.trim());
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
                () => `{{${cc_index++}}}`
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
        parse: function (cmd_raw, cmd_def) {
            const match = this._regexParams[Symbol.matchAll](cmd_raw);
            let scmd = Array.from(match, (x) => x[0]);
            const cmd = scmd[0];
            scmd = scmd.slice(1);
            const rawParams = scmd.join(" ");
            let params = _.map(scmd, (item) => {
                let nvalue = item;
                if (item[0] === '"' || item[0] === "'") {
                    nvalue = item.substr(1, item.length - 2);
                }
                return cmd_def.sanitized
                    ? this._sanitizeString(Utils.unescapeSlashes(nvalue))
                    : nvalue;
            });

            if (cmd_def.generators) {
                params = this._parameterGenerator.parse(params);
            }
            params = this.validateAndFormat(cmd_def.args, params);

            return {
                cmd: cmd,
                rawParams: rawParams,
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
            if (!args.length) {
                return params;
            }
            const formatted_params = [];
            let checkedCount = 0;
            for (
                let i = 0;
                i < args.length && checkedCount < params.length;
                ++i
            ) {
                let carg = args[i];
                const list_mode = i > 0 && args[i - 1] === "l";
                // Determine argument type (modifiers)
                if (["?", "l"].indexOf(carg) !== -1) {
                    continue;
                } else if (carg === "*") {
                    // No more 'carg' will be interpreted
                    for (; checkedCount < params.length; ++checkedCount) {
                        formatted_params.push(
                            this._formatters.s(params[checkedCount])
                        );
                    }
                    break;
                }

                // Parameter validation & formatting
                const param = params[checkedCount];

                if (carg === "-") {
                    const formatted_param = this._tryAllFormatters(
                        param,
                        list_mode
                    );
                    if (!_.isNull(formatted_param)) {
                        formatted_params.push(formatted_param);
                        ++checkedCount;
                        continue;
                    }

                    // Not found any compatible formatter
                    // fallback to generic string
                    carg = "s";
                } else if (!this._validators[carg](param, list_mode)) {
                    break;
                }
                formatted_params.push(this._formatters[carg](param, list_mode));
                ++checkedCount;
            }

            if (
                checkedCount !== params.length ||
                checkedCount < this._getNumRequiredArgs(args)
            ) {
                throw _t("Invalid command parameters");
            }

            return formatted_params;
        },

        /**
         * Convert array of command params to 'raw' string params
         * @param {Array} params
         * @returns {String}
         */
        stringify: function (params) {
            return _.map(params, function (item) {
                if (item.indexOf(" ") === -1) {
                    return item;
                }
                return `"${item}"`;
            }).join(" ");
        },

        /**
         * Free internal stores
         */
        resetStores: function () {
            this._parameterGenerator.resetStores();
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
            return str.replace(this._regexSanitize, '"');
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
                        JSON.parse(param_sa);
                    } catch (err) {
                        is_valid = false;
                        break;
                    }
                    ++index;
                }
                return is_valid;
            }

            try {
                JSON.parse(param);
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
                return _.map(param.split(","), (item) => item.trim());
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
                return _.map(param.split(","), (item) => Number(item.trim()));
            }
            return Number(param);
        },

        /**
         * Format value to js object
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Number}
         */
        _formatJson: function (param, list_mode = false) {
            if (list_mode) {
                return _.map(param.split(","), (item) =>
                    JSON.parse(item.trim())
                );
            }
            return JSON.parse(param);
        },
    });

    return ParameterReader;
});
