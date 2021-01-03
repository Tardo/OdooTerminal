// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.ParameterReader", function(require) {
    "use strict";

    const ParameterGenerator = require("terminal.core.ParameterGenerator");
    const Utils = require("terminal.core.Utils");
    const Class = require("web.Class");

    /**
     * This class is used to parse terminal command parameters.
     */
    const ParameterReader = Class.extend({
        init: function() {
            this._validators = {
                s: this._validateString,
                i: this._validateInt,
            };
            this._formatters = {
                s: this._formatString,
                i: this._formatInt,
            };
            this._regexSanitize = new RegExp("'", "g");
            this._regexParams = new RegExp(
                /(["'])(?:(?=(\\?))\2.)*?\1|[^\s]+/,
                "g"
            );
            this._regexArgs = new RegExp(/[l?*]/);
            this._parameterGenerator = new ParameterGenerator();
        },

        /**
         * Split and trim values
         * @param {String} text
         * @param {String} separator
         * @returns {Array}
         */
        splitAndTrim: function(text, separator) {
            return _.map(text.split(separator), item => item.trim());
        },

        /**
         * Sanitize command parameters to use when invoke commands.
         * @param {String} cmd_raw
         * @param {Object} cmd_def
         * @returns {Object}
         */
        parse: function(cmd_raw, cmd_def) {
            const match = this._regexParams[Symbol.matchAll](cmd_raw);
            let scmd = Array.from(match, x => x[0]);
            const cmd = scmd[0];
            scmd = scmd.slice(1);
            const rawParams = scmd.join(" ");
            let params = _.map(scmd, item => {
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
        validateAndFormat: function(args, params) {
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
                let list_mode = false;
                let carg = args[i];
                // Determine argument type (modifiers)
                if (carg === "?") {
                    carg = args[++i];
                } else if (carg === "l") {
                    carg = args[++i];
                    list_mode = true;
                } else if (carg === "*") {
                    for (; checkedCount < params.length; ++checkedCount) {
                        formatted_params.push(
                            this._formatters.s(params[checkedCount])
                        );
                    }
                    break;
                }
                // Parameter validation & formatting
                const param = params[checkedCount];
                if (!this._validators[carg](param, list_mode)) {
                    break;
                }
                formatted_params.push(this._formatters[carg](param, list_mode));
                ++checkedCount;
            }

            if (
                checkedCount !== params.length ||
                checkedCount < this._getNumRequiredArgs(args)
            ) {
                throw new Error("Invalid command parameters");
            }

            return formatted_params;
        },

        /**
         * Convert array of command params to 'raw' string params
         * @param {Array} params
         * @returns {String}
         */
        stringify: function(params) {
            return _.map(params, function(item) {
                if (item.indexOf(" ") === -1) {
                    return item;
                }
                return `"${item}"`;
            }).join(" ");
        },

        /**
         * Free internal stores
         */
        resetStores: function() {
            this._parameterGenerator.resetStores();
        },

        /**
         * Get the number of required arguments
         * @param {String} args
         * @returns {Int}
         */
        _getNumRequiredArgs: function(args) {
            const match = args.match(this._regexArgs);
            return match ? match.index : args.length;
        },

        /**
         * Replace all quotes to double-quotes.
         * @param {String} str
         * @returns {String}
         */
        _sanitizeString: function(str) {
            return str.replace(this._regexSanitize, '"');
        },

        /**
         * Test if is an string.
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Boolean}
         */
        _validateString: function(param, list_mode = false) {
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
        _validateInt: function(param, list_mode = false) {
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
         * Format value to string
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {String}
         */
        _formatString: function(param, list_mode = false) {
            if (list_mode) {
                return _.map(param.split(","), item => item.trim());
            }
            return param;
        },

        /**
         * Format value to integer
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Number}
         */
        _formatInt: function(param, list_mode = false) {
            if (list_mode) {
                return _.map(param.split(","), item => Number(item.trim()));
            }
            return Number(param);
        },
    });

    return ParameterReader;
});
