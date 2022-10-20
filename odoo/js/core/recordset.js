// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.recordset", function () {
    "use strict";

    const RecordHandler = {
        get(target, prop) {
            if (
                prop === "toJSON" ||
                prop === "toWrite" ||
                prop === "rollback" ||
                prop === "persist" ||
                typeof prop === "symbol"
            ) {
                const ref = target[prop];
                if (typeof ref === "function") {
                    return ref.bind(target);
                }
                return target[prop];
            }
            return target.values[prop];
        },
        set(target, prop, value) {
            target.modified_fields.push(prop);
            if (target.values.length === 1) {
                return Reflect.set(target.values[0], prop, value);
            }
            return Reflect.set(target.values, prop, value);
        },

        ownKeys(target) {
            return Reflect.ownKeys(target.values);
        },
        has(target, key) {
            return key in target.values;
        },
        getOwnPropertyDescriptor() {
            return {configurable: true, enumerable: true};
        },
    };

    class Record {
        #origin = {};
        modified_fields = [];
        constructor(values) {
            this.#origin = {...values};
            this.values = values;
        }

        persist() {
            this.#origin = {...this.values};
            this.modified_fields = [];
        }

        toJSON() {
            return this.values;
        }

        toWrite() {
            const write_vals = {};
            for (const field_name of this.modified_fields) {
                write_vals[field_name] = this.values[field_name];
            }
            return write_vals;
        }

        rollback() {
            for (const field_name of this.modified_fields) {
                this.values[field_name] = this.#origin[field_name];
            }
            this.modified_fields = [];
        }

        get [Symbol.toStringTag]() {
            return `[Record object]`;
        }

        [Symbol.toPrimitive](hint) {
            if (hint === "string") {
                return JSON.stringify(this.values);
            }
        }
    }

    const RecordsetHandler = {
        get(target, prop) {
            if (prop === "model") {
                return target.model;
            } else if (prop === "ids") {
                return target.ids;
            } else if (prop === "length") {
                return target.length;
            } else if (
                prop === "toWrite" ||
                prop === "rollback" ||
                prop === "persist" ||
                prop === "toJSON" ||
                typeof prop === "symbol"
            ) {
                const ref = target[prop];
                if (typeof ref === "function") {
                    return ref.bind(target);
                }
                return target[prop];
            }

            if (
                prop.constructor === String &&
                _.isNaN(Number(prop)) &&
                target.records.length === 1
            ) {
                return target.records[0][prop];
            }
            return target.records[prop];
        },
        set(target, prop, value) {
            if (target.records.length === 1) {
                return Reflect.set(target.records[0], prop, value);
            }
            return Reflect.set(target.records, prop, value);
        },
    };

    class Recordset {
        #model = null;
        records = [];

        static isValid(obj) {
            return obj instanceof Recordset;
        }

        static make(model, values) {
            const rs = new Recordset(model, values);
            return new Proxy(rs, RecordsetHandler);
        }

        constructor(model, values) {
            this.#model = model;
            for (const rec_vals of values) {
                const record = new Record(rec_vals);
                this.records.push(new Proxy(record, RecordHandler));
            }
        }

        toJSON() {
            return this.records;
        }

        toWrite() {
            const write_vals = [];
            for (const rec of this.records) {
                const values = rec.toWrite();
                if (!_.isEmpty(values)) {
                    write_vals.push([rec.id, values]);
                }
            }
            return write_vals;
        }

        rollback() {
            for (const rec of this.records) {
                rec.rollback();
            }
        }

        persist() {
            for (const rec of this.records) {
                rec.persist();
            }
        }

        get length() {
            return this.records.length;
        }

        get model() {
            return this.#model;
        }

        get ids() {
            const id_vals = [];
            for (const rec of this.records) {
                id_vals.push(rec.id);
            }
            return id_vals;
        }

        get [Symbol.toStringTag]() {
            return `[Recordset ${this.#model}]`;
        }

        *[Symbol.iterator]() {
            for (const rec of this.records) {
                yield rec;
            }
        }
    }

    return Recordset;
});
