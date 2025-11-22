// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isEmpty from '@trash/utils/is_empty';
import isNumber from '@trash/utils/is_number';

export type FieldDef = {...};

const RecordHandler = {
  // $FlowFixMe
  get(target: Object, prop: mixed) {
    if (
      prop === 'toJSON' ||
      prop === 'toWrite' ||
      prop === 'rollback' ||
      prop === 'persist' ||
      prop === '__info' ||
      typeof prop === 'symbol'
    ) {
      const ref = target[prop];
      return  (typeof ref === 'function') ? ref.bind(target) : ref;
    }
    return target.__values[prop];
  },
  // $FlowFixMe
  set(target: Object, prop: mixed, value: mixed) {
    target.__modified_fields.push(prop);
    if (target.__values.length === 1) {
      return Reflect.set(target.__values[0], prop, value);
    }
    return Reflect.set(target.__values, prop, value);
  },

  // $FlowFixMe
  ownKeys(target: Object) {
    return Reflect.ownKeys(target.__values);
  },
  // $FlowFixMe
  has(target: Object, prop: mixed) {
    if (typeof prop === 'string' || typeof prop === 'number') {
      return prop in target.__values;
    }
    return false;
  },
  getOwnPropertyDescriptor() {
    return {configurable: true, enumerable: true};
  },
};

export class Record {
  #origin: {[string]: mixed} = {};
  __info: FieldDef;
  __values: {[string]: mixed};
  __modified_fields: Array<string> = [];

  constructor(values: {...}, field_info: FieldDef) {
    this.#origin = {...values};
    this.__values = values;
    this.__info = field_info;
  }

  persist() {
    this.#origin = {...this.__values};
    this.__modified_fields = [];
  }

  toJSON(): {...} {
    return this.__values;
  }

  toWrite(): {[string]: mixed} {
    const write_vals: {[string]: mixed} = {};
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

  // $FlowFixMe
  get [Symbol.toStringTag]() {
    return `[Record object]`;
  }

  // $FlowFixMe
  [Symbol.toPrimitive](hint) {
    if (hint === 'string') {
      return JSON.stringify(this.__values);
    }
  }
}

const RecordsetHandler = {
  // $FlowFixMe
  get(target: Object, prop: mixed) {
    if (prop === 'model') {
      return target.model;
    } else if (prop === 'ids') {
      return target.ids;
    } else if (prop === 'length') {
      return target.length;
    } else if (
      prop === 'toWrite' ||
      prop === 'rollback' ||
      prop === 'persist' ||
      prop === 'toJSON' ||
      prop === 'map' ||
      typeof prop === 'symbol'
    ) {
      const ref = target[prop];
      if (typeof ref === 'function') {
        return ref.bind(target);
      }
      return target[prop];
    }

    if (typeof prop === 'string' && !isNumber(prop) && target.records.length === 1) {
      return target.records[0][prop];
    }
    return target.records[prop];
  },
  // $FlowFixMe
  set(target: Object, prop: mixed, value: mixed) {
    if (target.records.length === 1) {
      return Reflect.set(target.records[0], prop, value);
    }
    return Reflect.set(target.records, prop, value);
  },
};

export default class Recordset {
  #model: string;
  #records: Array<Record> = [];
  #fields: {[string]: FieldDef} = {};

  // $FlowFixMe
  static isValid(obj: Object) {
    return obj instanceof Recordset;
  }

  static make(model: string, values: Array<{[string]: mixed}>, fields?: {[string]: FieldDef}): Recordset {
    const rs = new Recordset(model, values, fields);
    return new Proxy(rs, RecordsetHandler);
  }

  constructor(model: string, values: Array<{[string]: mixed}>, fields?: {[string]: FieldDef}) {
    this.#model = model;
    this.#fields = fields || {};
    for (const rec_vals of values) {
      const record = new Record(rec_vals, this.#fields);
      this.#records.push(new Proxy(record, RecordHandler));
    }
  }

  toJSON(): Array<{...}> {
    return this.#records.map(rec => rec.toJSON());
  }

  toWrite(): $ReadOnlyArray<[number, {[string]: mixed}]> {
    const write_vals = [];
    for (const rec of this.#records) {
      const values = rec.toWrite();
      if (!isEmpty(values)) {
        // $FlowFixMe
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
    // $FlowFixMe
    return this.#records.map(item => item[key]);
  }

  // $FlowFixMe
  get length() {
    return this.#records.length;
  }

  // $FlowFixMe
  get model() {
    return this.#model;
  }

  // $FlowFixMe
  get records() {
    return this.#records;
  }

  // $FlowFixMe
  get ids() {
    const id_vals = [];
    for (const rec of this.#records) {
      // $FlowFixMe
      id_vals.push(rec.id);
    }
    return id_vals;
  }

  // $FlowFixMe
  get [Symbol.toStringTag]() {
    return `[Recordset ${this.#model}]`;
  }

  // $FlowFixMe
  *[Symbol.iterator]() {
    for (const rec of this.#records) {
      yield rec;
    }
  }
}
