// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export const LEXER = {
  Delimiter: 1,
  Concat: 2,
  Variable: 3,
  ArgumentShort: 4,
  ArgumentLong: 5,
  Assignment: 6,
  DataAttribute: 7,
  Runner: 8,
  Array: 9,
  String: 10,
  StringSimple: 11,
  Number: 12,
  Dictionary: 13,
  Boolean: 14,
  Space: 15,
  Math: 16,
  Add: 17,
  Substract: 18,
  Multiply: 19,
  Divide: 20,
  Modulo: 21,
  Pow: 22,
  Block: 23,
  Negative: 24,
  Positive: 25,
};

export const LEXER_MATH_OPER = [
  LEXER.Add,
  LEXER.Substract,
  LEXER.Multiply,
  LEXER.Divide,
  LEXER.Modulo,
  LEXER.Pow,
];

export const LEXERDATA = [
  LEXER.Variable,
  LEXER.Runner,
  LEXER.Array,
  LEXER.String,
  LEXER.StringSimple,
  LEXER.Number,
  LEXER.Dictionary,
  LEXER.Boolean,
  LEXER.Math,
];

export const LEXERDATA_EXTENDED = LEXERDATA.concat([
  LEXER.DataAttribute,
  LEXER.Negative,
  LEXER.Positive,
]);

export const INSTRUCTION_TYPE = {
  LOAD_NAME: 1,
  LOAD_GLOBAL: 2,
  LOAD_ARG: 3,
  LOAD_CONST: 4,
  STORE_NAME: 5,
  STORE_SUBSCR: 6,
  CALL_FUNCTION: 7,
  CALL_FUNCTION_SILENT: 8,
  RETURN_VALUE: 9,
  LOAD_DATA_ATTR: 10,
  BUILD_LIST: 11,
  BUILD_MAP: 12,
  CONCAT: 13,
  ADD: 14,
  SUBSTRACT: 15,
  MULTIPLY: 16,
  DIVIDE: 17,
  MODULO: 18,
  POW: 19,
  PUSH_FRAME: 20,
  POP_FRAME: 21,
  UNITARY_NEGATIVE: 22,
  UNITARY_POSITIVE: 23,

  getHumanType: function (type) {
    return Object.entries(this).find(item => item[1] === type) || '';
  },
};

// Const INSTRUCTION_NEXT = {
//     [INSTRUCTION_TYPE.LOAD_NAME]: [INSTRUCTION_TYPE.LOAD_DATA_ATTR],
//     [INSTRUCTION_TYPE.LOAD_GLOBAL]: [
//         INSTRUCTION_TYPE.LOAD_ARG,
//         INSTRUCTION_TYPE.LOAD_CONST,
//         INSTRUCTION_TYPE.LOAD_NAME,
//     ],
//     [INSTRUCTION_TYPE.LOAD_ARG]: [
//         INSTRUCTION_TYPE.LOAD_CONST,
//         INSTRUCTION_TYPE.LOAD_NAME,
//     ],
//     [INSTRUCTION_TYPE.LOAD_CONST]: null,
//     [INSTRUCTION_TYPE.STORE_NAME]: [
//         INSTRUCTION_TYPE.LOAD_CONST,
//         INSTRUCTION_TYPE.STORE_SUBSCR,
//     ],
//     [INSTRUCTION_TYPE.STORE_SUBSCR]: [
//         INSTRUCTION_TYPE.LOAD_CONST,
//         INSTRUCTION_TYPE.STORE_SUBSCR,
//     ],
//     [INSTRUCTION_TYPE.CALL_FUNCTION]: null,
//     [INSTRUCTION_TYPE.CALL_FUNCTION_SILENT]: [
//         INSTRUCTION_TYPE.LOAD_CONST,
//         INSTRUCTION_TYPE.STORE_SUBSCR,
//     ],
// };

export const ARG = {
  String: 1 << 0,
  Number: 1 << 1,
  Dictionary: 1 << 2,
  Flag: 1 << 3,
  Any: 1 << 4,
  List: 1 << 5,

  getHumanType: function (atype) {
    const nmix_type = atype & ~ARG.List;
    const utypes = [];
    const entries = Object.entries(this);
    for (const entry of entries) {
      if ((entry[1] & nmix_type) === nmix_type) {
        utypes.push(entry[0].toUpperCase());
      }
    }
    if ((atype & this.List) === this.List) {
      return `LIST OF ${utypes.join(' or ')}`;
    }
    return utypes.join(' or ');
  },
  getType: function (val) {
    const val_constructor = val.constructor;
    if (val_constructor === String) {
      return this.String;
    } else if (val_constructor === Number) {
      return this.Number;
    } else if (val_constructor === Object) {
      return this.Dictionary;
    } else if (val_constructor === Boolean) {
      return this.Flag;
    } else if (val_constructor === Array) {
      return this.List;
    }
    return this.Any;
  },
  cast: function (val, atype) {
    const val_constructor = val.constructor;
    if (atype === this.String && val_constructor !== String) {
      return String(val);
    } else if (atype === this.Number && val_constructor !== Number) {
      return Number(val);
    } else if (atype === this.Dictionary && val_constructor !== Object) {
      return Object.fromEntries(val);
    } else if (atype === this.Flag && val_constructor !== Boolean) {
      return Boolean(val);
    } else if (atype === this.List && val_constructor !== Array) {
      return [val];
    }
    return val;
  },
};

export const SYMBOLS = {
  ADD: '+',
  SUBSTRACT: '-',
  MULTIPLY: '*',
  DIVIDE: '/',
  MODULO: '%',
  POW: '^',
  CONCAT: '+',
  ASSIGNMENT: '=',
  ARGUMENT: '-',
  ARRAY_START: '[',
  ARRAY_END: ']',
  DICTIONARY_SEPARATOR: ':',
  ITEM_DELIMITER: ',',
  RUNNER_START: '(',
  RUNNER_END: ')',
  STRING: '"',
  STRING_SIMPLE: "'",
  VARIABLE: '$',
  SPACE: ' ',
  EOC: ';',
  EOL: '\n',
  ESCAPE: '\\',
  MATH_START: '(',
  MATH_END: ')',
  MATH_BLOCK_START: '(',
  MATH_BLOCK_END: ')',
  BLOCK_START: '{',
  BLOCK_END: '}',
};

export const SYMBOLS_MATH_OPER = [
  SYMBOLS.ADD,
  SYMBOLS.SUBSTRACT,
  SYMBOLS.MULTIPLY,
  SYMBOLS.DIVIDE,
  SYMBOLS.MODULO,
  SYMBOLS.POW,
];

export const SYMBOLS_MATH_SIGN = [SYMBOLS.ADD, SYMBOLS.SUBSTRACT];

export const KEYWORDS = {
  TRUE: 'true',
  FALSE: 'false',
  FOR: 'for',
  IN: 'in',
};

export const MATH_OPER_PRIORITIES = [
  SYMBOLS.POW,
  SYMBOLS.DIVIDE,
  SYMBOLS.MULTIPLY,
  SYMBOLS.MODULO,
  SYMBOLS.SUBSTRACT,
  SYMBOLS.ADD,
];

// FIXME: Inaccurate keymap
//      '_' and '-' positions are only valid for spanish layout
export const KEYMAP = [
  'q',
  'w',
  'e',
  'r',
  't',
  'y',
  'u',
  'i',
  'o',
  'p',
  'a',
  's',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  null,
  'z',
  'x',
  'c',
  'v',
  'b',
  'n',
  'm',
  '_',
  '-',
  null,
];
