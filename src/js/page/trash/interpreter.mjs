// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {
  KEYWORDS,
  LEXER,
  LEXERDATA_EXTENDED_SET,
  LEXER_MATH_OPER_SET,
  SYMBOLS,
  SYMBOLS_MATH_OPER_SET,
  SYMBOLS_MATH_OPER_FIRST_CHARS,
  SYMBOLS_MATH_OPER_COMPLEX_FIRST_CHARS,
} from './constants';
import ASTParser from './parser';
import CodeGen from './codegen';
import isFalsy from './utils/is_falsy';
import isNumber from './utils/is_number';
import type Instruction from './instruction';
import type {default as VMachine, EvalOptions} from './vmachine';
import type Frame from './frame';

export type ArgDefNames = [string, string];
export type ArgDef = [type: number, args: [string, string], is_required: boolean, description: string, default_value?: mixed, strict_values?: $ReadOnlyArray<number | string>];

export type ArgInfo = {
  type: number,
  names: {
    short: string,
    long: string,
  },
  description: string,
  default_value?: mixed,
  strict_values?: $ReadOnlyArray<number | string>,
  is_required: boolean,
  list_mode: boolean,
  raw: ArgDef,
}

// $FlowFixMe[unclear-type]
export type CMDCallbackContext = {[string]: any};
// $FlowFixMe[unclear-type]
export type CMDCallbackArgs = {[string]: any};
export type CMDCallback = (kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) => Promise<mixed>;
export type CMDCallbackInternal = (vmachine: VMachine, kwargs: {[string]: mixed}, frame: Frame, opts: EvalOptions) => Promise<mixed>;
export type CMDOptionsCallback = (arg_name: string) => Promise<$ReadOnlyArray<string>>;

export type TokenInfo = {
  value: string,
  raw: string,
  type: number,
  start: number,
  end: number,
  index: number,
};

export type ParseInfo = {
  program: {
    instructions: Array<Instruction>,
    names: Array<Array<string | null>>,
    values: Array<Array<mixed>>,
  },
  inputTokens: Array<Array<TokenInfo>>,
  inputRawString: string,
  nestingDepth: number,
};

export type CMDDef = {
  definition: string,
  callback: CMDCallback | CMDCallbackInternal,
  options: CMDOptionsCallback,
  detail: string,
  args: $ReadOnlyArray<ArgDef>,
  secured: boolean,
  unsafe: boolean,
  aliases: $ReadOnlyArray<string>,
  example: string,
  type: number,
};

export type RegisteredCMD = {[string]: CMDDef};

export type ParserOptions = {
  registeredCmds?: RegisteredCMD,
  math?: boolean,
  isData?: boolean,
  offset?: number,
  silent?: boolean,
  noReturn?: boolean,
  ignoreErrors?: boolean,
  delimiter?: string,
};

export type LexerInfo = [number, string, string];

// Operator tokens that map 1:1 to a lexer type (only valid when not preceded by a delimiter)
const OPERATOR_LEXER_TYPES: Map<string, number> = new Map([
  [SYMBOLS.AND, LEXER.And],
  [SYMBOLS.OR, LEXER.Or],
  [SYMBOLS.NOT, LEXER.Not],
  [SYMBOLS.EQUAL, LEXER.Equal],
  [SYMBOLS.NOT_EQUAL, LEXER.NotEqual],
  [SYMBOLS.GREATER_THAN_OPEN, LEXER.GreaterThanOpen],
  [SYMBOLS.LESS_THAN_OPEN, LEXER.LessThanOpen],
  [SYMBOLS.GREATER_THAN_CLOSED, LEXER.GreaterThanClosed],
  [SYMBOLS.LESS_THAN_CLOSED, LEXER.LessThanClosed],
  [SYMBOLS.ASSIGNMENT, LEXER.Assignment],
  [SYMBOLS.ASSIGNMENT_ADD, LEXER.AssignmentAdd],
  [SYMBOLS.ASSIGNMENT_SUBSTRACT, LEXER.AssignmentSubstract],
  [SYMBOLS.ASSIGNMENT_MULTIPLY, LEXER.AssignmentMultiply],
  [SYMBOLS.ASSIGNMENT_DIVIDE, LEXER.AssignmentDivide],
  [SYMBOLS.INCREMENT, LEXER.Increment],
  [SYMBOLS.DECREMENT, LEXER.Decrement],
]);

/**
 * This is TraSH
 */
export default class Interpreter {
  #regexComments: RegExp = new RegExp(/^(\s*)?\/\/.*|^(\s*)?\/\*.+\*\//gm);

  getCanonicalCommandName(cmd_name: string, registered_cmds: RegisteredCMD): string | void {
    if (Object.hasOwn(registered_cmds, cmd_name)) {
      return cmd_name;
    }

    for (const cname of Object.keys(registered_cmds)) {
      if (registered_cmds[cname].aliases.includes(cmd_name)) {
        return cname;
      }
    }

    return undefined;
  }

  /**
   * Split the input data into usable tokens
   * FIXME: This is getting a lot of complexity... need be refactored!
   * Someday this will use AST...
   * @param {String} data
   * @returns {Array}
   */
  tokenize(data: string, options: ParserOptions): Array<TokenInfo> {
    // Remove comments
    const clean_data = data.replaceAll(this.#regexComments, '').replaceAll(SYMBOLS.ESCAPE, "\\");
    const delimiter = options.delimiter ?? SYMBOLS.ITEM_DELIMITER;
    const tokens = [];
    let value = '';
    let in_string = '';
    let in_array = 0;
    let in_lblock = 0;
    let in_block = 0;
    let do_cut = false;
    let prev_char = '';
    let escape_next = false;
    let prev_token: LexerInfo | void;
    let prev_token_no_space: LexerInfo | void;
    const clean_data_len = clean_data.length;
    for (let char_index = 0; char_index < clean_data_len; ++char_index) {
      const char = clean_data[char_index];
      const in_data_type = in_array || in_block || in_lblock;
      const is_escaped = escape_next;
      escape_next = char === SYMBOLS.ESCAPE && !is_escaped && Boolean(in_string);
      if (!is_escaped) {
        if (char === SYMBOLS.STRING || char === SYMBOLS.STRING_SIMPLE) {
          if (in_string && char === in_string) {
            in_string = '';
          } else if (!in_string && !in_data_type) {
            in_string = char;
            do_cut = true;
          }
        } else if (!in_string) {
          if (char === SYMBOLS.ARRAY_START) {
            if (!in_data_type) {
              do_cut = true;
            }
            ++in_array;
          } else if (in_array && char === SYMBOLS.ARRAY_END) {
            --in_array;
          } else if (char === SYMBOLS.BLOCK_START) {
            if (!in_data_type) {
              do_cut = true;
            }
            ++in_block;
          } else if (in_block && char === SYMBOLS.BLOCK_END) {
            --in_block;
          } else if (char === SYMBOLS.LOGIC_BLOCK_START) {
            if (!in_data_type) {
              do_cut = true;
            }
            ++in_lblock;
          } else if (in_lblock && char === SYMBOLS.LOGIC_BLOCK_END) {
            --in_lblock;
          } else if (!in_data_type) {
            if (
              !isFalsy(options?.isData) &&
              (char === delimiter ||
                char === SYMBOLS.DICTIONARY_SEPARATOR ||
                prev_char === delimiter ||
                prev_char === SYMBOLS.DICTIONARY_SEPARATOR)
            ) {
              do_cut = true;
            } else if (
              char === SYMBOLS.EOC ||
              char === SYMBOLS.EOL ||
              (char === SYMBOLS.VARIABLE && prev_char !== SYMBOLS.VARIABLE) ||
              (char === SYMBOLS.ASSIGNMENT && prev_char !== SYMBOLS.ASSIGNMENT && (prev_char === '' || !SYMBOLS_MATH_OPER_FIRST_CHARS.has(prev_char))) ||
              (char === SYMBOLS.NOT && prev_char !== SYMBOLS.NOT) ||
              // NOTE: '++' must stay a single token ('--' already accumulates thanks to the ARGUMENT guard)
              (SYMBOLS_MATH_OPER_FIRST_CHARS.has(char) && (prev_char === '' || !SYMBOLS_MATH_OPER_COMPLEX_FIRST_CHARS.has(prev_char)) && !value.startsWith(SYMBOLS.ARGUMENT) && !(char === SYMBOLS.ADD && value === SYMBOLS.ADD)) ||
              prev_char === SYMBOLS.EOC ||
              prev_char === SYMBOLS.EOL ||
              (char !== SYMBOLS.ASSIGNMENT && prev_char === SYMBOLS.ASSIGNMENT && !SYMBOLS_MATH_OPER_SET.has(value)) ||
              (char !== SYMBOLS.NOT && prev_char === SYMBOLS.NOT && char !== SYMBOLS.NOT_EQUAL[1]) ||
              (!SYMBOLS_MATH_OPER_FIRST_CHARS.has(char) && SYMBOLS_MATH_OPER_SET.has(value) && (isNumber(char) || char === SYMBOLS.VARIABLE))
            ) {
              do_cut = true;
            } else if (
              (prev_char !== SYMBOLS.SPACE && char === SYMBOLS.SPACE) ||
              (prev_char === SYMBOLS.SPACE && char !== SYMBOLS.SPACE)
            ) {
              do_cut = true;
            }
          }
        }
      }
      if (do_cut) {
        if (value) {
          prev_token = this.#lexer(value, char, prev_token, prev_token_no_space, options);
          tokens.push(prev_token);
          if (prev_token[0] !== LEXER.Space) {
            prev_token_no_space = prev_token;
          }
          value = '';
        }
        do_cut = false;
      }
      value += char;
      prev_char = char;
    }
    if (value) {
      tokens.push(this.#lexer(value, undefined, prev_token, prev_token_no_space, options));
    }


    const tokens_info: Array<TokenInfo> = [];
    const tokens_len: number = tokens.length;
    let offset: number = options?.offset || 0;
    for (let i = 0; i < tokens_len; ++i) {
      const [token_type, token, raw] = tokens[i];
      if (token_type !== LEXER.Space) {
        tokens_info.push({
          value: token,
          raw: raw,
          type: token_type,
          start: offset,
          end: offset + raw.length,
          index: i,
        });
      }
      offset += raw.length;
    }
    return tokens_info;
  }

  #isDict(stoken: string): boolean {
    let depth = 0;
    let inStr = '';
    let escapeNext = false;
    const slen = stoken.length;
    if (slen === 0) {
      return true;
    }
    for (let i = 0; i < slen; ++i) {
      const ch = stoken[i];
      const isEscaped = escapeNext;
      escapeNext = ch === SYMBOLS.ESCAPE && !isEscaped && Boolean(inStr);
      if (!isEscaped) {
        if (ch === SYMBOLS.STRING || ch === SYMBOLS.STRING_SIMPLE) {
          if (inStr === ch) {
            inStr = '';
          } else if (!inStr) {
            inStr = ch;
          }
        } else if (!inStr) {
          if (ch === SYMBOLS.BLOCK_START || ch === SYMBOLS.ARRAY_START || ch === SYMBOLS.LOGIC_BLOCK_START) {
            ++depth;
          } else if (ch === SYMBOLS.BLOCK_END || ch === SYMBOLS.ARRAY_END || ch === SYMBOLS.LOGIC_BLOCK_END) {
            --depth;
          } else if (ch === SYMBOLS.DICTIONARY_SEPARATOR && depth === 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Classify tokens
   * @param {Array} tokens
   */
  #lexer(token: string, next_char: string | void, prev_token_info: LexerInfo | void, prev_token_info_no_space: LexerInfo | void, options: ParserOptions): LexerInfo {
    const delimiter = options.delimiter ?? SYMBOLS.ITEM_DELIMITER;
    let token_san = token.trim();
    let ttype = LEXER.String;
    const oper_ttype = OPERATOR_LEXER_TYPES.get(token_san);
    if (!token_san) {
      if (token === SYMBOLS.EOL) {
        ttype = LEXER.Delimiter;
      } else {
        ttype = LEXER.Space;
      }
    } else if (isFalsy(options?.isData) && prev_token_info && prev_token_info[0] === LEXER.Space && token_san[0] === SYMBOLS.ARGUMENT && ((token_san.length === 1 && typeof next_char === 'undefined') || (token_san.length > 1 && token_san[1] !== SYMBOLS.LOGIC_BLOCK_START && token_san[1] !== SYMBOLS.ASSIGNMENT && !isNumber(token_san[1])))) {
      if (token_san[1] === SYMBOLS.ARGUMENT) {
        ttype = LEXER.ArgumentLong;
        token_san = token_san.substr(2);
      } else {
        ttype = LEXER.ArgumentShort;
        token_san = token_san.substr(1);
      }
    } else if (
      token_san === SYMBOLS.EOC ||
      token_san === SYMBOLS.DICTIONARY_SEPARATOR ||
      token_san === delimiter
    ) {
      ttype = LEXER.Delimiter;
    } else if (
      typeof oper_ttype !== 'undefined' &&
      (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)
    ) {
      ttype = oper_ttype;
    } else if (token_san[0] === SYMBOLS.ARRAY_START && token_san.at(-1) === SYMBOLS.ARRAY_END) {
      token_san = token_san.substr(1, token_san.length - 2);
      token_san = token_san.trim();
      if (
        prev_token_info &&
        (prev_token_info[0] === LEXER.Variable ||
          prev_token_info[0] === LEXER.DataAttribute ||
          prev_token_info[0] === LEXER.LogicBlock)
      ) {
        ttype = LEXER.DataAttribute;
      } else {
        ttype = LEXER.Array;
      }
    } else if (token_san[0] === SYMBOLS.BLOCK_START && token_san.at(-1) === SYMBOLS.BLOCK_END) {
      token_san = token_san.substr(1, token_san.length - 2);
      token_san = token_san.trim();
      if (this.#isDict(token_san)) {
        ttype = LEXER.Dictionary;
      } else {
        ttype = LEXER.Block;
      }
    } else if (
      token_san[0] === SYMBOLS.LOGIC_BLOCK_START &&
      token_san.at(-1) === SYMBOLS.LOGIC_BLOCK_END
    ) {
      token_san = token_san.substr(1, token_san.length - 2);
      token_san = token_san.trim();
      ttype = LEXER.LogicBlock;
    } else if (token_san[0] === SYMBOLS.VARIABLE && token_san[1] === SYMBOLS.VARIABLE) {
      ttype = LEXER.VariableCall;
      token_san = token_san.substr(2);
    } else if (token_san[0] === SYMBOLS.VARIABLE) {
      ttype = LEXER.Variable;
      token_san = token_san.substr(1);
    } else if (token_san[0] === SYMBOLS.STRING && token_san.at(-1) === SYMBOLS.STRING) {
      ttype = LEXER.String;
    } else if (token_san[0] === SYMBOLS.STRING_SIMPLE && token_san.at(-1) === SYMBOLS.STRING_SIMPLE) {
      ttype = LEXER.StringSimple;
    } else if (isNumber(token_san)) {
      ttype = LEXER.Number;
    } else if (token_san === KEYWORDS.TRUE || token_san === KEYWORDS.FALSE) {
      ttype = LEXER.Boolean;
    } else if (token_san === KEYWORDS.NULL) {
      ttype = LEXER.Null;
    } else if (token_san === KEYWORDS.FUNCTION) {
      ttype = LEXER.Function;
    } else if (token_san === KEYWORDS.RETURN) {
      ttype = LEXER.Return;
    } else if (token_san === KEYWORDS.IF) {
      ttype = LEXER.If;
    } else if (token_san === KEYWORDS.ELIF) {
      ttype = LEXER.Elif;
    } else if (token_san === KEYWORDS.ELSE) {
      ttype = LEXER.Else;
    } else if (token_san === KEYWORDS.FOR) {
      ttype = LEXER.For;
    } else if (token_san === KEYWORDS.BREAK) {
      ttype = LEXER.Break;
    } else if (token_san === KEYWORDS.CONTINUE) {
      ttype = LEXER.Continue;
    } else if (token_san === KEYWORDS.SILENT) {
      ttype = LEXER.Silent;
    } else if (token_san === SYMBOLS.ADD) {
      ttype = LEXER.Add;
    } else if (token_san === SYMBOLS.SUBSTRACT) {
      // FIXME: This is a bit crazy :)
      if ((!prev_token_info || (prev_token_info && (prev_token_info[0] === LEXER.Space || (!isNumber(prev_token_info[1]) && prev_token_info[0] !== LEXER.Variable && prev_token_info[0] !== LEXER.LogicBlock)))) && next_char !== SYMBOLS.SPACE && (next_char === SYMBOLS.VARIABLE || next_char === SYMBOLS.LOGIC_BLOCK_START || isNumber(next_char) || (prev_token_info_no_space && LEXER_MATH_OPER_SET.has(prev_token_info_no_space[0])))) {
        ttype = LEXER.Negative;
      } else {
        ttype = LEXER.Substract;
      }
    } else if (prev_token_info_no_space && prev_token_info_no_space[0] !== LEXER.ArgumentShort && prev_token_info_no_space[0] !== LEXER.ArgumentLong) {
      if (token_san === SYMBOLS.MULTIPLY) {
        ttype = LEXER.Multiply;
      } else if (token_san === SYMBOLS.DIVIDE) {
        ttype = LEXER.Divide;
      } else if (token_san === SYMBOLS.MODULO) {
        ttype = LEXER.Modulo;
      }
    }

    if (ttype === LEXER.String || ttype === LEXER.StringSimple) {
      if (typeof prev_token_info !== 'undefined' && LEXERDATA_EXTENDED_SET.has(prev_token_info[0])) {
        ttype = LEXER.Unknown;
      }
      token_san = this.#unescapeString(this.#trimQuotes(token_san));
    }
    return [ttype, token_san, token];
  }

  /**
   * Compile the input into the executable program
   * @param {String} data
   * @returns {Object}
   */
  parse(data: string, options: ParserOptions, level: number = 0): ParseInfo {
    const tokens = this.tokenize(data, options);
    const ast_parser = new ASTParser(
      {
        tokenize: (sub_data: string, sub_options: ParserOptions) => this.tokenize(sub_data, sub_options),
        compile: (sub_data: string, sub_options: ParserOptions) => this.parse(sub_data, sub_options),
        getCanonicalCommandName: (cmd_name: string, registered_cmds: RegisteredCMD) =>
          this.getCanonicalCommandName(cmd_name, registered_cmds),
      },
      options,
    );
    const root = ast_parser.parse(tokens);
    const codegen = new CodeGen();
    const gen_options: ParserOptions = level !== 0 ? {...options, noReturn: true} : options;
    return codegen.generate(data, root, ast_parser.getUnits(), gen_options);
  }


  #unescapeString(str: string): string {
    if (!str.includes(SYMBOLS.ESCAPE)) {
      return str;
    }
    let result = '';
    let i = 0;
    const len = str.length;
    while (i < len) {
      if (str[i] === SYMBOLS.ESCAPE && i + 1 < len) {
        const next = str[i + 1];
        switch (next) {
          case '"':
          case "'":
          case SYMBOLS.ESCAPE:
            result += next;
            i += 2;
            break;
          case 'n':
            result += '\n';
            i += 2;
            break;
          case 't':
            result += '\t';
            i += 2;
            break;
          case 'r':
            result += '\r';
            i += 2;
            break;
          default:
            result += str[i];
            i++;
        }
      } else {
        result += str[i];
        i++;
      }
    }
    return result;
  }

  #trimQuotes(str: string): string {
    const str_trim = str.trim();
    const first_char = str_trim[0];
    const last_char = str_trim.at(-1);
    if (
      (first_char === '"' && last_char === '"') ||
      (first_char === "'" && last_char === "'") ||
      (first_char === '`' && last_char === '`')
    ) {
      return str_trim.substring(1, str_trim.length - 1);
    }
    return str_trim;
  }
}
