// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.ParameterGenerator", function (require) {
    "use strict";

    const time = require("web.time");
    const Class = require("web.Class");

    /**
     * This class is used to generate values for terminal command parameters.
     */
    const ParameterGenerator = Class.extend({
        _rndLetter: {
            [Symbol.iterator]: function* () {
                const characters = "bcdfghjklmnpqrstvwxyz ";
                const vocals = "aeiou";
                const characters_length = characters.length;
                const vocals_length = vocals.length;
                let cur_char = "";
                let last_char = "";
                let count = 0;
                let cc_count = 0;

                const isVocal = (letter) => vocals.indexOf(letter) !== -1;

                for (;;) {
                    if (cc_count < 2 && (!last_char || isVocal(last_char))) {
                        cur_char = characters.charAt(
                            Math.floor(Math.random() * characters_length)
                        );
                        ++cc_count;
                    } else {
                        cur_char = vocals.charAt(
                            Math.floor(Math.random() * vocals_length)
                        );
                        cc_count = 0;
                    }

                    if (count === 0 || last_char === " ") {
                        cur_char = cur_char.toUpperCase();
                    }
                    if (cur_char !== last_char) {
                        last_char = cur_char;
                        ++count;
                        yield cur_char;
                    }
                }
            },
        },

        _intIterStore: [],
        _intIterStoreIndex: 0,

        init: function () {
            this._generators = {
                FLOAT: this.generateFloat.bind(this),
                INT: this.generateInt.bind(this),
                INTSEQ: this.generateIntSeq.bind(this),
                INTITER: this._doIntIter.bind(this),
                STR: this.generateString.bind(this),
                DATE: this.generateDate.bind(this),
                TZDATE: this.generateTzDate.bind(this),
                TIME: this.generateTime.bind(this),
                TZTIME: this.generateTzTime.bind(this),
                DATETIME: this.generateDateTime.bind(this),
                TZDATETIME: this.generateTzDateTime.bind(this),
                NOW: this.getDateTime,
                TZNOW: this.getTzDateTime,
                NOWTIME: this.getTime,
                TZNOWTIME: this.getTzTime,
                NOWDATE: this.getDate,
                TZNOWDATE: this.getTzDate,
                EMAIL: this.generateEmail.bind(this),
                URL: this.generateUrl.bind(this),
            };
            this._regexParamGenerator = new RegExp(
                /(\$(\w+)(?:\[(\d+)(?:,(\d+))?\])*)/,
                "g"
            );
        },

        parse: function (params) {
            const parsed_params = [];
            this._resetStoreIndexes();
            const params_len = params.length;
            let index = 0;
            while (index < params_len) {
                let param = params[index];
                const matches = [
                    ...String(param).matchAll(this._regexParamGenerator),
                ];
                const matches_len = matches.length;
                let index_b = 0;
                while (index_b < matches_len) {
                    const match = matches[index_b];
                    if (Object.hasOwn(this._generators, match[2])) {
                        const gen_val = this._generators[match[2]](
                            ...match.splice(3)
                        );
                        if (gen_val !== false) {
                            param = param.replace(match[0], gen_val);
                        }
                    }
                    ++index_b;
                }
                parsed_params.push(param);
                ++index;
            }
            return parsed_params;
        },

        resetStores: function () {
            this._intIterStore = [];
            this._resetStoreIndexes();
        },

        _resetStoreIndexes: function () {
            this._intIterStoreIndex = 0;
        },

        generateEmail: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const email_name = this.generateString(min, max);
            const email_domain_a = this.generateString(min, max);
            const email_domain_b = this.generateString(2, 3);
            return `${email_name}@${email_domain_a}.${email_domain_b}`
                .replaceAll(" ", "")
                .toLowerCase();
        },

        generateUrl: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const url = this.generateString(min, max);
            const ext = this.generateString(2, 3);
            return `https://www.${url}.${ext}`
                .replaceAll(" ", "")
                .toLowerCase();
        },

        generateFloat: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const min_s = _.isUndefined(max) ? 0 : Number(min);
            const max_s = _.isUndefined(max) ? Number(min) : Number(max);
            return Number(
                (Math.random() * (max_s - min_s + 1.0) + min_s).toFixed(2)
            );
        },

        generateInt: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const min_s = _.isUndefined(max) ? 0 : Number(min);
            const max_s = _.isUndefined(max) ? Number(min) : Number(max);
            return Math.floor(Math.random() * (max_s - min_s + 1) + min_s);
        },

        generateIntSeq: function (min, max) {
            if (typeof min === "undefined") {
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

        _doIntIter: function (min, step = 1) {
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

        generateString: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const rlen = this.generateInt(min, max);
            let result = "";
            let index = 0;
            for (const letter of this._rndLetter) {
                if (index >= rlen) {
                    break;
                }
                result += letter;
                ++index;
            }
            return result;
        },

        generateTzDate: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const rdate = this.generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangDateFormat());
        },

        generateDate: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const rdate = this.generateInt(min, max);
            return time.date_to_str(new Date(rdate));
        },

        generateTzTime: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const rdate = this.generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangTimeFormat());
        },

        generateTime: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const rdate = this.generateInt(min, max);
            return time.time_to_str(new Date(rdate));
        },

        generateTzDateTime: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const rdate = this.generateInt(min, max);
            return moment(new Date(rdate)).format(time.getLangDatetimeFormat());
        },

        generateDateTime: function (min, max) {
            if (typeof min === "undefined") {
                return false;
            }
            const rdate = this.generateInt(min, max);
            return time.datetime_to_str(new Date(rdate));
        },

        getTzDate: function () {
            return moment().format(time.getLangDateFormat());
        },

        getDate: function () {
            return time.date_to_str(new Date());
        },

        getTzTime: function () {
            return moment().format(time.getLangTimeFormat());
        },

        getTime: function () {
            return time.time_to_str(new Date());
        },

        getTzDateTime: function () {
            return moment().format(time.getLangDatetimeFormat());
        },

        getDateTime: function () {
            return time.datetime_to_str(new Date());
        },
    });

    return ParameterGenerator;
});
