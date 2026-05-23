// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isEmpty from '@trash/utils/is_empty';
import isNumber from '@trash/utils/is_number';

export type RecordDef = {+id?: number, display_name?: string, [string]: mixed};

export type FieldDef = {...};

const RecordHandler = {
  get(target: {...}, prop: mixed): mixed {
    if (
      prop === 'toJSON' ||
      prop === 'toWrite' ||
      prop === 'rollback' ||
      prop === 'persist' ||
      prop === '__info' ||
      typeof prop === 'symbol'
    ) {
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[invalid-computed-prop]
      const ref = target[prop];
      return  (typeof ref === 'function') ? ref.bind(target) : ref;
    }
    // $FlowFixMe[prop-missing]
    return target.__values[prop];
  },
  set(target: {...}, prop: mixed, value: mixed): boolean {
    // $FlowFixMe[prop-missing]
    target.__modified_fields.push(prop);
    // $FlowFixMe[prop-missing]
    if (target.__values.length === 1) {
      // $FlowFixMe[prop-missing]
      return Reflect.set(target.__values[0], prop, value);
    }
    // $FlowFixMe[prop-missing]
    return Reflect.set(target.__values, prop, value);
  },

  ownKeys(target: {...}): $ReadOnlyArray<string | symbol> {
    // $FlowFixMe[prop-missing]
    return Reflect.ownKeys(target.__values);
  },
  has(target: {...}, prop: mixed): boolean {
    if (typeof prop === 'string' || typeof prop === 'number') {
      // $FlowFixMe[prop-missing]
      return prop in target.__values;
    }
    return false;
  },
  getOwnPropertyDescriptor(): {configurable: boolean, enumerable: boolean} {
    return {configurable: true, enumerable: true};
  },
};

export class Record {
  #origin: RecordDef = {};
  __info: FieldDef;
  __values: RecordDef;
  __modified_fields: Array<string> = [];

  constructor(values: RecordDef, field_info: FieldDef) {
    // $FlowFixMe[cannot-spread-indexer]
    this.#origin = {...values};
    this.__values = values;
    this.__info = field_info;
  }

  persist() {
    // $FlowFixMe[cannot-spread-indexer]
    this.#origin = {...this.__values};
    this.__modified_fields = [];
  }

  toJSON(): RecordDef {
    return this.__values;
  }

  toWrite(): RecordDef {
    const write_vals: RecordDef = {};
    for (const field_name of this.__modified_fields) {
      write_vals[field_name] = this.__values[field_name];
    }
    return write_vals;
  }

  rollback() {
    for (const field_name of this.__modified_fields) {
      this.__values[field_name] = this.#origin[field_name];
    }
    this.__modified_fields = [];
  }

  // $FlowFixMe[unsupported-syntax]
  get [Symbol.toStringTag](): string {
    return `[Record object]`;
  }

  // $FlowFixMe[unsupported-syntax]
  [Symbol.toPrimitive](hint: string): string | void {
    if (hint === 'string') {
      return JSON.stringify(this.__values);
    }
  }
}

const RecordsetHandler = {
  get(target: {...}, prop: mixed): mixed {
    if (prop === 'model') {
      // $FlowFixMe[prop-missing]
      return target.model;
    } else if (prop === 'ids') {
      // $FlowFixMe[prop-missing]
      return target.ids;
    } else if (prop === 'length') {
      // $FlowFixMe[prop-missing]
      return target.length;
    } else if (prop === 'fieldNames') {
      // $FlowFixMe[prop-missing]
      return target.fieldNames;
    } else if (
      prop === 'toWrite' ||
      prop === 'rollback' ||
      prop === 'persist' ||
      prop === 'toJSON' ||
      prop === 'map' ||
      typeof prop === 'symbol'
    ) {
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[invalid-computed-prop]
      const ref = target[prop];
      if (typeof ref === 'function') {
        return ref.bind(target);
      }
      // $FlowFixMe[prop-missing]
      // $FlowFixMe[invalid-computed-prop]
      return target[prop];
    }

    if (typeof prop === 'string' && !isNumber(prop)) {
      // $FlowFixMe[prop-missing]
      if (target.records.length === 1) {
        // $FlowFixMe[prop-missing]
        return target.records[0][prop];
      }
    }
    // $FlowFixMe[prop-missing]
    return target.records[prop];
  },
  set(target: {...}, prop: mixed, value: mixed): boolean {
    // $FlowFixMe[prop-missing]
    if (target.records.length === 1) {
      // $FlowFixMe[prop-missing]
      return Reflect.set(target.records[0], prop, value);
    }
    // $FlowFixMe[prop-missing]
    return Reflect.set(target.records, prop, value);
  },
};

export default class Recordset {
  #model: string;
  #records: Array<Record> = [];
  #fields: {[string]: FieldDef} = {};

  static isValid(obj: mixed): boolean {
    return obj instanceof Recordset;
  }

  static make(model: string, values: $ReadOnlyArray<RecordDef>, fields?: {[string]: FieldDef}): Recordset {
    const rs = new Recordset(model, values, fields);
    // $FlowFixMe[incompatible-variance]
    // $FlowFixMe[incompatible-type]
    // $FlowFixMe[class-object-subtyping]
    return new Proxy(rs, RecordsetHandler);
  }

  constructor(model: string, values: $ReadOnlyArray<RecordDef>, fields?: {[string]: FieldDef}) {
    this.#model = model;
    this.#fields = fields || {};
    for (const rec_vals of values) {
      const record = new Record(rec_vals, this.#fields);
      // $FlowFixMe[incompatible-variance]
      // $FlowFixMe[incompatible-type]
      // $FlowFixMe[class-object-subtyping]
      this.#records.push(new Proxy(record, RecordHandler));
    }
  }

  toJSON(): Array<RecordDef> {
    return this.#records.map(rec => rec.toJSON());
  }

  toWrite(): $ReadOnlyArray<[number | void, RecordDef]> {
    const write_vals: Array<[number | void, RecordDef]> = [];
    for (const rec of this.#records) {
      const values = rec.toWrite();
      if (!isEmpty(values)) {
        // $FlowFixMe[prop-missing]
        write_vals.push([rec.id, values]);
      }
    }
    return write_vals;
  }

  rollback() {
    for (const rec of this.#records) {
      rec.rollback();
    }
  }

  persist() {
    for (const rec of this.#records) {
      rec.persist();
    }
  }

  map(key: string): Array<mixed> {
    // $FlowFixMe[prop-missing]
    return this.#records.map(item => item[key]);
  }

  // $FlowFixMe[unsafe-getters-setters]
  get length(): number {
    return this.#records.length;
  }

  // $FlowFixMe[unsafe-getters-setters]
  get model(): string {
    return this.#model;
  }

  // $FlowFixMe[unsafe-getters-setters]
  get records(): Array<Record> {
    return this.#records;
  }

  // $FlowFixMe[unsafe-getters-setters]
  get fieldNames(): Array<string> {
    // $FlowFixMe[incompatible-type]
    return Object.keys(this.#records[0]);
  }

  // $FlowFixMe[unsafe-getters-setters]
  get ids(): Array<number | void> {
    const id_vals: Array<number | void> = [];
    for (const rec of this.#records) {
      // $FlowFixMe[prop-missing]
      id_vals.push(rec.id);
    }
    return id_vals;
  }

  // $FlowFixMe[unsupported-syntax]
  get [Symbol.toStringTag](): string {
    return `[Recordset ${this.#model}]`;
  }

  // $FlowFixMe[unsupported-syntax]
  *[Symbol.iterator](): Generator<Record, void, void> {
    for (const rec of this.#records) {
      yield rec;
    }
  }
}
