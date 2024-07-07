// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


export const LEXER = {
  Delimiter: 1,
  Variable: 2,
  ArgumentShort: 3,
  ArgumentLong: 4,
  Assignment: 5,
  DataAttribute: 6,
  Array: 7,
  String: 8,
  StringSimple: 9,
  Number: 10,
  Dictionary: 11,
  Boolean: 12,
  Space: 13,
  Add: 14,
  Substract: 15,
  Multiply: 16,
  Divide: 17,
  Modulo: 18,
  Pow: 19,
  Block: 20,
  Negative: 21,
  Positive: 22,
  For: 23,
  In: 24,
  Function: 25,
  And: 26,
  Or: 27,
  Not: 28,
  Equal: 29,
  NotEqual: 30,
  GreaterThanOpen: 31,
  LessThanOpen: 32,
  GreaterThanClosed: 33,
  LessThanClosed: 34,
  LogicBlock: 35,
  Return: 36,
  If: 37,
  Elif: 38,
  Else: 39,
  Silent: 40,
  VariableCall: 41,
  Break: 42,
  Continue: 43,
};

export const LEXER_MATH_C = [
  LEXER.Variable,
  LEXER.DataAttribute,
  LEXER.Number,
  LEXER.LogicBlock,
  LEXER.VariableCall,
]

export const LEXER_MATH_OPER = [
  LEXER.Add,
  LEXER.Substract,
  LEXER.Multiply,
  LEXER.Divide,
  LEXER.Modulo,
  LEXER.Pow,
  LEXER.And,
  LEXER.Or,
  LEXER.Equal,
  LEXER.NotEqual,
  LEXER.GreaterThanOpen,
  LEXER.LessThanOpen,
  LEXER.GreaterThanClosed,
  LEXER.LessThanClosed,
];

export const LEXERDATA = [
  LEXER.Variable,
  LEXER.VariableCall,
  LEXER.Array,
  LEXER.String,
  LEXER.StringSimple,
  LEXER.Number,
  LEXER.Dictionary,
  LEXER.Boolean,
  LEXER.LogicBlock,
];

export const LEXERDATA_EXTENDED: Array<number> = LEXERDATA.concat([
  LEXER.DataAttribute,
  LEXER.Negative,
  LEXER.Positive,
  LEXER.Not,
]);

export const INSTRUCTION_TYPE = {
  LOAD_NAME: 1,
  LOAD_NAME_CALLEABLE: 2,
  LOAD_GLOBAL: 3,
  LOAD_ARG: 4,
  LOAD_CONST: 5,
  STORE_NAME: 6,
  STORE_SUBSCR: 7,
  CALL_FUNCTION: 8,
  CALL_FUNCTION_SILENT: 9,
  RETURN_VALUE: 10,
  LOAD_DATA_ATTR: 11,
  BUILD_LIST: 12,
  BUILD_MAP: 13,
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
  GET_ITER: 24,
  FOR_ITER: 25,
  MAKE_FUNCTION: 26,
  AND: 27,
  OR: 28,
  NOT: 29,
  EQUAL: 30,
  NOT_EQUAL: 31,
  GREATER_THAN_OPEN: 32,
  LESS_THAN_OPEN: 33,
  GREATER_THAN_CLOSED: 34,
  LESS_THAN_CLOSED: 35,
  JUMP_IF_FALSE: 36,
  JUMP_IF_TRUE: 37,
  JUMP_BACKWARD: 38,
  JUMP_FORWARD: 39,

  getHumanType: function (type: number): string {
    const res = Object.entries(INSTRUCTION_TYPE).find(item => item[1] === type);
    return res ? res[0] : '';
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

export const ARG: {
  +[string]: number,
  getHumanType: (atype: number) => string,
  getType: (val: mixed) => number,
  cast: (val: mixed, atype: number) => mixed,
} = {
  String: 1 << 0,
  Number: 1 << 1,
  Dictionary: 1 << 2,
  Flag: 1 << 3,
  Any: 1 << 4,
  List: 1 << 5,

  getHumanType: function (atype: number): string {
    const nmix_type = atype & ~ARG.List;
    const utypes = [];
    const entries = Object.entries(ARG);
    for (const entry of entries) {
      if (typeof entry[1] === 'number' && (entry[1] & nmix_type) === nmix_type) {
        utypes.push(entry[0].toUpperCase());
      }
    }
    if ((atype & ARG.List) === ARG.List) {
      return `LIST OF ${utypes.join(' or ')}`;
    }
    return utypes.join(' or ');
  },
  getType: function (val: mixed): number {
    const val_typeof = typeof val;
    if (val_typeof === 'string') {
      return ARG.String;
    } else if (val_typeof === 'number') {
      return ARG.Number;
    } else if (val_typeof === 'boolean') {
      return ARG.Flag;
    } else if (val instanceof Array) {
      return ARG.List;
    } else if (val_typeof === 'object') {
      return ARG.Dictionary;
    }
    return ARG.Any;
  },
  cast: function (val: mixed, atype: number): mixed {
    const val_typeof = typeof val;
    if (atype === ARG.String && val_typeof !== 'string') {
      return String(val);
    } else if (atype === ARG.Number && val_typeof !== 'number') {
      return Number(val);
    } else if (atype === ARG.Flag && val_typeof !== 'boolean') {
      return Boolean(val);
    } else if (atype === ARG.List && !(val_typeof instanceof Array)) {
      return [val];
    } else if (atype === ARG.Dictionary && val_typeof !== 'object') {
      // $FlowIgnore
      return Object.fromEntries((val: Array<[mixed, mixed]>));
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
  ASSIGNMENT: '=',
  ARGUMENT: '-',
  ARRAY_START: '[',
  ARRAY_END: ']',
  DICTIONARY_SEPARATOR: ':',
  ITEM_DELIMITER: ',',
  STRING: '"',
  STRING_SIMPLE: "'",
  VARIABLE: '$',
  SPACE: ' ',
  EOC: ';',
  EOL: '\n',
  ESCAPE: '\\',
  BLOCK_START: '{',
  BLOCK_END: '}',
  FUNCTION_ARGS_START: '(',
  FUNCTION_ARGS_END: ')',
  AND: '&&',
  OR: '||',
  NOT: '!',
  EQUAL: '==',
  NOT_EQUAL: '!=',
  GREATER_THAN_OPEN: '>',
  LESS_THAN_OPEN: '<',
  GREATER_THAN_CLOSED: '>=',
  LESS_THAN_CLOSED: '<=',
  LOGIC_BLOCK_START: '(',
  LOGIC_BLOCK_END: ')',
};

export const SYMBOLS_MATH_OPER = [
  SYMBOLS.ADD,
  SYMBOLS.SUBSTRACT,
  SYMBOLS.MULTIPLY,
  SYMBOLS.DIVIDE,
  SYMBOLS.MODULO,
  SYMBOLS.POW,
  SYMBOLS.AND,
  SYMBOLS.OR,
  SYMBOLS.EQUAL,
  SYMBOLS.NOT_EQUAL,
  SYMBOLS.GREATER_THAN_OPEN,
  SYMBOLS.LESS_THAN_OPEN,
  SYMBOLS.GREATER_THAN_CLOSED,
  SYMBOLS.LESS_THAN_CLOSED,
];

export const SYMBOLS_MATH_SIGN = [SYMBOLS.ADD, SYMBOLS.SUBSTRACT];

export const KEYWORDS = {
  TRUE: 'true',
  FALSE: 'false',
  FOR: 'for',
  FUNCTION: 'function',
  RETURN: 'return',
  IF: 'if',
  ELIF: 'elif',
  ELSE: 'else',
  SILENT: 'silent',
  CONTINUE: 'continue',
  BREAK: 'break',
};

export const MATH_OPER_PRIORITIES = [
  SYMBOLS.POW,
  SYMBOLS.DIVIDE,
  SYMBOLS.MULTIPLY,
  SYMBOLS.MODULO,
  SYMBOLS.SUBSTRACT,
  SYMBOLS.ADD,
  SYMBOLS.EQUAL,
  SYMBOLS.NOT_EQUAL,
  SYMBOLS.GREATER_THAN_OPEN,
  SYMBOLS.LESS_THAN_OPEN,
  SYMBOLS.GREATER_THAN_CLOSED,
  SYMBOLS.LESS_THAN_CLOSED,
  SYMBOLS.AND,
  SYMBOLS.OR,
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
