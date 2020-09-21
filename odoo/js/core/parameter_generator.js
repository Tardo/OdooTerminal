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

        _intIterStore: [],
        _intIterStoreIndex: 0,

        init: function() {
            this._generators = {
                EMAIL: this._generateEmail.bind(this),
                INT: this._generateInt.bind(this),
                INTSEQ: this._generateIntSeq.bind(this),
                INTITER: this._doIntIter.bind(this),
                STR: this._generateString.bind(this),
                DATE: this._generateDate.bind(this),
                TZDATE: this._generateTzDate.bind(this),
                TIME: this._generateTime.bind(this),
                TZTIME: this._generateTzTime.bind(this),
                DATETIME: this._generateDateTime.bind(this),
                TZDATETIME: this._generateTzDateTime.bind(this),
                NOW: this._getDateTime,
                TZNOW: this._getTzDateTime,
                NOWTIME: this._getTime,
                TZNOWTIME: this._getTzTime,
                NOWDATE: this._getDate,
                TZNOWDATE: this._getTzDate,
            };
            this._regexParamGenerator = new RegExp(
                /(\$(\w+)(?:\[(\d+)(?:,(\d+))?\])*)/,
                "g"
            );
        },

        parse: function(params) {
            const parsed_params = [];
            this._resetStoreIndexes();
            for (let param of params) {
                const matches = String(param).matchAll(
                    this._regexParamGenerator
                );
                for (const match of matches) {
                    if (match[2] in this._generators) {
                        const gen_val = this._generators[match[2]](
                            ...match.splice(3)
                        );
                        if (gen_val !== false) {
                            param = param.replace(match[0], gen_val);
                        }
                    }
                }
                parsed_params.push(param);
            }
            return parsed_params;
        },

        resetStores: function() {
            this._intIterStore = [];
            this._resetStoreIndexes();
        },

        _resetStoreIndexes: function() {
            this._intIterStoreIndex = 0;
        },

        _generateEmail: function(min, max) {
            if (!min) {
                return false;
            }
            const email_name = this._generateString(min, max);
            const email_domain_a = this._generateString(min, max);
            const email_domain_b = this._generateString(2, 3);
            return `${email_name}@${email_domain_a}.${email_domain_b}`.replaceAll(
                " ",
                ""
            );
        },

        _generateInt: function(min, max) {
            if (!min) {
                return false;
            }
            const min_s = _.isUndefined(max) ? 0 : Number(min);
            const max_s = _.isUndefined(max) ? Number(min) : Number(max);
            return Math.floor(Math.random() * (max_s - min_s + 1) + min_s);
        },

        _generateIntSeq: function(min, max) {
            if (!min) {
                return false;
            }
            const min_s = _.isUndefined(max) ? 0 : Number(min);
            const max_s = _.isUndefined(max) ? Number(min) : Number(max);
            const numbers = [];
            for (let i = min_s; i <= max_s; ++i) {
                numbers.push(i);
            }
            return numbers.join();
        },

        _doIntIter: function(min, step = 1) {
            const store_index = this._intIterStoreIndex++;
            let int_iter_store = this._intIterStore[store_index];
            if (!int_iter_store) {
                int_iter_store = {
                    value: Number(min) || 1,
                };
                this._intIterStore[store_index] = int_iter_store;
                return int_iter_store.value;
            }
            return (int_iter_store.value += Number(step));
        },

        _generateString: function(min, max) {
            if (!min) {
                return false;
            }
            const rlen = this._generateInt(min, max);
            let result = "";
            let count = 0;
            for (const letter of this._rndLetter) {
                if (count === rlen) {
                    break;
                }
                result += letter;
                ++count;
            }
            return result;
        },

        _generateTzDate: function(min, max) {
            if (!min) {
                return false;
            }
            const rdate = this._generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangDateFormat());
        },

        _generateDate: function(min, max) {
            if (!min) {
                return false;
            }
            const rdate = this._generateInt(min, max);
            return time.date_to_str(new Date(rdate));
        },

        _generateTzTime: function(min, max) {
            if (!min) {
                return false;
            }
            const rdate = this._generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangTimeFormat());
        },

        _generateTime: function(min, max) {
            if (!min) {
                return false;
            }
            const rdate = this._generateInt(min, max);
            return time.time_to_str(new Date(rdate));
        },

        _generateTzDateTime: function(min, max) {
            if (!min) {
                return false;
            }
            const rdate = this._generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangDatetimeFormat());
        },

        _generateDateTime: function(min, max) {
            if (!min) {
                return false;
            }
            const rdate = this._generateInt(min, max);
            return time.datetime_to_str(new Date(rdate));
        },

        _getTzDate: function() {
            return moment().format(time.getLangDateFormat());
        },

        _getDate: function() {
            return time.date_to_str(new Date());
        },

        _getTzTime: function() {
            return moment().format(time.getLangTimeFormat());
        },

        _getTime: function() {
            return time.time_to_str(new Date());
        },

        _getTzDateTime: function() {
            return moment().format(time.getLangDatetimeFormat());
        },

        _getDateTime: function() {
            return time.datetime_to_str(new Date());
        },
    });

    return ParameterGenerator;
});
