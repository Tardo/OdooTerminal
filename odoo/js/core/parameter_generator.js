// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.ParameterGenerator", function(require) {
    "use strict";

    const time = require("web.time");
    const Class = require("web.Class");

    /**
     * This class is used to generate values for terminal command parameters.
     */
    const ParameterGenerator = Class.extend({
        _rndLetter: {
            [Symbol.iterator]: function*() {
                const characters =
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ";
                const charactersLength = characters.length;
                for (;;) {
                    yield characters.charAt(
                        Math.floor(Math.random() * charactersLength)
                    );
                }
            },
        },

        init: function() {
            this._generators = {
                INT: this._generateInt.bind(this),
                INTSEQ: this._generateIntSeq.bind(this),
                STR: this._generateString.bind(this),
                DATE: this._generateDate.bind(this),
                NOW: this._getDate,
                DATETIME: this._generateDateTime.bind(this),
                NOWTIME: this._getDateTime,
            };
            this._regexParamGenerator = new RegExp(
                /(\$(\w+)(?:\[(\d+),(\d+)\])*)/,
                "g"
            );
        },

        parse: function(params) {
            const parsed_params = [];
            for (let param of params) {
                const matches = String(param).matchAll(
                    this._regexParamGenerator
                );
                for (const match of matches) {
                    if (match[2] in this._generators) {
                        param = param.replace(
                            match[0],
                            this._generators[match[2]](...match.splice(3))
                        );
                    }
                }
                parsed_params.push(param);
            }
            return parsed_params;
        },

        _generateInt: function(min, max) {
            const min_s = Number(min);
            const max_s = Number(max);
            return Math.floor(Math.random() * (max_s - min_s + 1) + min_s);
        },

        _generateIntSeq: function(min, max) {
            const min_s = Number(min);
            const max_s = Number(max);
            const numbers = [];
            for (let i = min_s; i <= max_s; ++i) {
                numbers.push(i);
            }
            return numbers.join();
        },

        _generateString: function(min, max) {
            const rlen = this._generateInt(min, max);
            let result = "";
            let count = 0;
            for (const letter of this._rndLetter) {
                if (count > rlen) {
                    break;
                }
                result += letter;
                ++count;
            }
            return result;
        },

        _generateDate: function(min, max) {
            const rdate = this._generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangDateFormat());
        },

        _generateDateTime: function(min, max) {
            const rdate = this._generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangDatetimeFormat());
        },

        _getDate: function() {
            return moment().format(time.getLangDateFormat());
        },

        _getDateTime: function() {
            return moment().format(time.getLangDatetimeFormat());
        },
    });

    return ParameterGenerator;
});
