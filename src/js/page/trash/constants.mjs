// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


export const LEXER = {
  Delimiter: 1,
  Variable: 2,
  ArgumentShort: 3,
  ArgumentLong: 4,
  Assignment: 5,
  AssignmentAdd: 6,
  AssignmentSubstract: 7,
  AssignmentMultiply: 8,
  AssignmentDivide: 9,
  DataAttribute: 10,
  Array: 11,
  String: 12,
  StringSimple: 13,
  Number: 14,
  Dictionary: 15,
  Boolean: 16,
  Space: 17,
  Add: 18,
  Substract: 19,
  Multiply: 20,
  Divide: 21,
  Modulo: 22,
  Pow: 23,
  Block: 24,
  Negative: 25,
  Positive: 26,
  For: 27,
  In: 28,
  Function: 29,
  And: 30,
  Or: 31,
  Not: 32,
  Equal: 33,
  NotEqual: 34,
  GreaterThanOpen: 35,
  LessThanOpen: 36,
  GreaterThanClosed: 37,
  LessThanClosed: 38,
  LogicBlock: 39,
  Return: 40,
  If: 41,
  Elif: 42,
  Else: 43,
  Silent: 44,
  VariableCall: 45,
  Break: 46,
  Continue: 47,
  Null: 48,
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
  ADD_SELF: 40,

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
  ASSIGNMENT_ADD: '+=',
  ASSIGNMENT_SUBSTRACT: '-=',
  ASSIGNMENT_MULTIPLY: '*=',
  ASSIGNMENT_DIVIDE: '/=',
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
  NULL: 'null',
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
