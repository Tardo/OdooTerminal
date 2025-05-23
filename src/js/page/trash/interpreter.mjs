// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {
  INSTRUCTION_TYPE,
  KEYWORDS,
  LEXER,
  LEXERDATA,
  LEXERDATA_EXTENDED,
  LEXER_MATH_OPER,
  MATH_OPER_PRIORITIES,
  SYMBOLS,
  SYMBOLS_MATH_OPER,
  ARG,
} from './constants';
import Instruction from './instruction';
import countBy from './utils/count_by';
import isFalsy from './utils/is_falsy';
import isNumber from './utils/is_number';
import InvalidTokenError from './exceptions/invalid_token_error';
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

// $FlowFixMe
export type CMDCallbackContext = {[string]: Any};
// $FlowFixMe
export type CMDCallbackArgs = {[string]: Any};
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

export type ParseStackInfo = {
  instructions: Array<Instruction>,
  names: Array<string | null>,
  values: Array<mixed>,
  inputTokens: Array<Array<TokenInfo>>,
};
export type ParseInfo = {
  stack: {
    instructions: Array<Instruction>,
    names: Array<Array<string | null>>,
    values: Array<Array<mixed>>,
  },
  inputTokens: Array<Array<TokenInfo>>,
  inputRawString: string,
  maxULevel: number,
};

export type CMDDef = {
  definition: string,
  callback: CMDCallback | CMDCallbackInternal,
  options: CMDOptionsCallback,
  detail: string,
  args: $ReadOnlyArray<ArgDef>,
  secured: boolean,
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

export type FunctionParseInfo = [fun_name: string | void, fun_args: $ReadOnlyArray<ArgDef>, fun_code: string, index: number];
export type LoopForParseInfo = [for_init: string, for_check: string, for_iter: string, for_code: string, index: number];
export type IfParseInfo = [if_check: string, if_code: string, elif_codes: Array<[string, string]>, else_code: string | void, index: number];

/**
 * This is TraSH
 */
export default class Interpreter {
  #regexComments: RegExp = new RegExp(/^(\s*)?\/\/.*|^(\s*)?\/\*.+\*\//gm);

  /**
   * Split and trim values
   * @param {String} text
   * @param {String} separator
   * @returns {Array}
   */
  splitAndTrim(text: string, separator: string = ','): Array<string> {
    return text.split(separator).map(item => item.trim());
  }

  getCanonicalCommandName(cmd_name: string, registered_cmds: RegisteredCMD): string | void {
    if (Object.hasOwn(registered_cmds, cmd_name)) {
      return cmd_name;
    }

    const entries = Object.entries(registered_cmds);
    for (const [cname, cmd_def] of entries) {
      // $FlowFixMe
      if (cmd_def.aliases.indexOf(cmd_name) !== -1) {
        return cname;
      }
    }

    return undefined;
  }

  /**
   * Split the input data into usable tokens
   * FIXME: This is getting a lot of complexity... need be refactored!
   * @param {String} data
   * @returns {Array}
   */
  tokenize(data: string, options: ParserOptions): Array<TokenInfo> {
    // Remove comments
    const clean_data = data.replaceAll(this.#regexComments, '').replaceAll(SYMBOLS.ESCAPE, "\\");
    // $FlowIgnore
    const delimiter = options.delimiter || SYMBOLS.ITEM_DELIMITER;
    let tokens = [];
    let value = '';
    let in_string = '';
    let in_array = 0;
    let in_lblock = 0;
    let in_block = 0;
    let do_cut = false;
    let do_skip = false;
    let prev_char = '';
    let prev_token: LexerInfo | void;
    let prev_token_no_space: LexerInfo | void;
    const clean_data_len = clean_data.length;
    for (let char_index = 0; char_index < clean_data_len; ++char_index) {
      const char = clean_data[char_index];
      const in_data_type = in_array || in_block || in_lblock;
      if (prev_char !== SYMBOLS.ESCAPE) {
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
              (char === SYMBOLS.ASSIGNMENT && prev_char !== SYMBOLS.ASSIGNMENT && !SYMBOLS_MATH_OPER.filter(item => item.startsWith(prev_char)).length) ||
              (char === SYMBOLS.NOT && prev_char !== SYMBOLS.NOT) ||
              (SYMBOLS_MATH_OPER.filter(item => item.startsWith(char)).length && !SYMBOLS_MATH_OPER.filter(item => item.startsWith(prev_char)).length && !value.startsWith(SYMBOLS.ARGUMENT)) ||
              prev_char === SYMBOLS.EOC ||
              prev_char === SYMBOLS.EOL ||
              (char !== SYMBOLS.ASSIGNMENT && prev_char === SYMBOLS.ASSIGNMENT && !SYMBOLS_MATH_OPER.includes(value)) ||
              (char !== SYMBOLS.NOT && prev_char === SYMBOLS.NOT && char !== SYMBOLS.NOT_EQUAL[1]) ||
              (!SYMBOLS_MATH_OPER.filter(item => item.startsWith(char)).length && SYMBOLS_MATH_OPER.includes(value) && (isNumber(char) || char === SYMBOLS.VARIABLE))
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
      if (!do_skip) {
        value += char;
      }
      prev_char = char;
      do_skip = false;
    }
    if (value) {
      tokens.push(this.#lexer(value, undefined, prev_token, prev_token_no_space, options));
    }

    tokens = this.#prioritizer(tokens);

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

  /**
   * Classify tokens
   * @param {Array} tokens
   */
  #lexer(token: string, next_char: string | void, prev_token_info: LexerInfo | void, prev_token_info_no_space: LexerInfo | void, options: ParserOptions): LexerInfo {
    // FIXME: New level of ugly implementation here... but works :/
    const isDict = (stoken: string) => {
      const sepcount = countBy(stoken, char => char === ':').true;
      const dtokens = this.tokenize(stoken, {isData: true});
      let rstr = '';
      for (const tok of dtokens) {
        if (tok.type !== LEXER.Delimiter) {
          rstr += tok.raw;
        }
      }
      const rsepcount = countBy(rstr, char => char === ':').true;
      return rsepcount !== sepcount;
    };
    // $FlowIgnore
    const delimiter = options.delimiter || SYMBOLS.ITEM_DELIMITER;
    let token_san = token.trim();
    let ttype = LEXER.String;
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
    } else if (token_san === SYMBOLS.AND && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.And;
    } else if (token_san === SYMBOLS.OR && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.Or;
    } else if (token_san === SYMBOLS.NOT && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.Not;
    } else if (token_san === SYMBOLS.EQUAL && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.Equal;
    } else if (token_san === SYMBOLS.NOT_EQUAL && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.NotEqual;
    } else if (token_san === SYMBOLS.GREATER_THAN_OPEN && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.GreaterThanOpen;
    } else if (token_san === SYMBOLS.LESS_THAN_OPEN && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.LessThanOpen;
    } else if (token_san === SYMBOLS.GREATER_THAN_CLOSED && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.GreaterThanClosed;
    } else if (token_san === SYMBOLS.LESS_THAN_CLOSED && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.LessThanClosed;
    } else if (token_san === SYMBOLS.ASSIGNMENT && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.Assignment;
    } else if (token_san === SYMBOLS.ASSIGNMENT_ADD && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.AssignmentAdd;
    } else if (token_san === SYMBOLS.ASSIGNMENT_SUBSTRACT && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.AssignmentSubstract;
    } else if (token_san === SYMBOLS.ASSIGNMENT_MULTIPLY && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.AssignmentMultiply;
    } else if (token_san === SYMBOLS.ASSIGNMENT_DIVIDE && (!prev_token_info_no_space || prev_token_info_no_space[0] !== LEXER.Delimiter)) {
      ttype = LEXER.AssignmentDivide;
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
      if (isDict(token_san)) {
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
      if ((!prev_token_info || (prev_token_info && (prev_token_info[0] === LEXER.Space || (!isNumber(prev_token_info[1]) && prev_token_info[0] !== LEXER.Variable && prev_token_info[0] !== LEXER.LogicBlock)))) && next_char !== SYMBOLS.SPACE && (next_char === SYMBOLS.VARIABLE || next_char === SYMBOLS.LOGIC_BLOCK_START || isNumber(next_char) || (prev_token_info_no_space && LEXER_MATH_OPER.includes(prev_token_info_no_space[0])))) {
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
      } else if (token_san === SYMBOLS.POW) {
        ttype = LEXER.Pow;
      }
    }

    if (ttype === LEXER.String || ttype === LEXER.StringSimple) {
      if (typeof prev_token_info !== 'undefined' && LEXERDATA_EXTENDED.includes(prev_token_info[0])) {
        ttype = LEXER.Unknown;
      }
      token_san = this.#trimQuotes(token_san);
    }
    return [ttype, token_san, token];
  }

  #getDataInstructions(tokens: Array<LexerInfo>, from: number, inverse_search: boolean): Array<LexerInfo> {
    const data_tokens = [];
    const push_token = function (token: LexerInfo) {
      if (token[0] === LEXER.String || token[0] === LEXER.StringSimple || !LEXERDATA_EXTENDED.includes(token[0])) {
        return false;
      }
      data_tokens.push(token);
      return true;
    };
    const tokens_len = tokens.length;
    if (inverse_search) {
      for (let token_index = from; token_index >= 0; --token_index) {
        if (!push_token(tokens[token_index])) {
          break;
        }
      }
      data_tokens.reverse();
    } else {
      for (let token_index = from; token_index < tokens_len; ++token_index) {
        if (!push_token(tokens[token_index])) {
          break;
        }
      }
    }
    return data_tokens;
  }

  #tokenList2str(tokens: Array<LexerInfo>): string {
    let res_str = '';
    for (const token of tokens) {
      res_str += token[0] === LEXER.LogicBlock ? `(${token[1]})` : token[2];
    }
    return res_str;
  }

  #prioritizer(tokens: Array<LexerInfo>): Array<LexerInfo> {
    const tokens_math_oper = tokens.filter(item => LEXER_MATH_OPER.includes(item[0]));
    if (tokens_math_oper.length <= 1) {
      return tokens;
    }
    let tokens_no_spaces = tokens.filter(item => item[0] !== LEXER.Space);
    for (const tok_prio of MATH_OPER_PRIORITIES) {
      const ntokens: Array<LexerInfo> = [];
      const tokens_len = tokens_no_spaces.length;
      for (let token_index = 0; token_index < tokens_len; ++token_index) {
        const [, token_val] = tokens_no_spaces[token_index];
        if (ntokens.length > 0 && token_val === tok_prio) {
          const prev_token = tokens_no_spaces[token_index - 1];
          const next_token = tokens_no_spaces[token_index + 1];
          if (prev_token[0] === LEXER.String || prev_token[0] === LEXER.StringSimple || (next_token && (next_token[0] === LEXER.String || next_token[0] === LEXER.StringSimple))) {
            return tokens;
          }
          const prev_ntokens = this.#getDataInstructions(ntokens, ntokens.length - 1, true);
          const next_ntokens = this.#getDataInstructions(tokens_no_spaces, token_index + 1, false);
          const prev_ntokens_str = this.#tokenList2str(prev_ntokens);
          const next_ntokens_str = this.#tokenList2str(next_ntokens);
          for (let i = 0; i < prev_ntokens.length; ++i) {
            ntokens.pop();
          }
          for (let i = 0; i < next_ntokens.length; ++i) {
            ++token_index;
          }
          const fstr = `${prev_ntokens_str}${token_val}${next_ntokens_str}`;
          ntokens.push([LEXER.LogicBlock, fstr, `(${fstr})`]);
        } else {
          ntokens.push(tokens_no_spaces[token_index]);
        }
      }
      tokens_no_spaces = ntokens;
    }
    return tokens_no_spaces;
  }

  #parseFunction(inputTokens: $ReadOnlyArray<TokenInfo>, index: number, options: ParserOptions): FunctionParseInfo | void {
    let init_index: number = index;
    let fun_name: string;
    let fun_args: Array<ArgDef> = [];

    let token_active = inputTokens[++init_index];
    if (typeof token_active === 'undefined') {
      return;
    }
    // Name
    let active_value = token_active.raw.trim();
    if (active_value.startsWith(SYMBOLS.FUNCTION_ARGS_START)) {
      active_value = token_active.value.trim();
      if (active_value.length > 0) {
        fun_args = active_value.split(',')
          .map(item => ([ARG.Any, [item.trim(), item.trim()], false, i18n.t('cmdFuncTrash.args.name', 'The function parameter'), undefined]: ArgDef));
      }
    } else {
      fun_name = active_value;
      // Args
      token_active = inputTokens[++init_index];
      if (typeof token_active === 'undefined') {
        return;
      }
      active_value = token_active.value.trim();
      if (active_value.length > 0) {
        fun_args = active_value.split(',')
          .map(item => {
            // eslint-disable-next-line prefer-const
            let [varass, vardef] = item.split('=');
            vardef = vardef && vardef.trim();
            if (vardef) {
              // $FlowIgnore
              vardef = this.parse(vardef, options);
            }
            let [varname, vartype] = varass.split(':');
            varname = varname && varname.trim();
            vartype = vartype && vartype.trim();
            // FIXME: I'm not really convinced by the way it's done
            const vartypes = vartype?.split('|');
            let svartype = 0;
            if (vartypes?.length > 0) {
              for (const vtype of vartypes) {
                if (Object.hasOwn(ARG, vtype)) {
                  svartype |= ARG[vtype];
                }
              }
            }
            if (svartype === 0) {
              svartype = ARG.Any;
            }
            return ([svartype, [varname, varname], false, i18n.t('cmdFuncTrash.args.name', 'The function parameter'), vardef]: ArgDef);
          });
      }
    }

    // Code
    token_active = inputTokens[++init_index];
    if (typeof token_active === 'undefined') {
      return;
    }
    if (token_active.type !== LEXER.Block) {
      return;
    }

    const fun_code = token_active.value.trim();
    return [fun_name, fun_args, fun_code, init_index];
  }

  #parseLoopFor(inputTokens: $ReadOnlyArray<TokenInfo>, index: number): LoopForParseInfo | void {
    let init_index: number = index;
    let for_args: Array<string> = [];

    let token_active = inputTokens[++init_index];
    if (typeof token_active === 'undefined') {
      return;
    }
    // Args
    const active_value = token_active.raw.trim();
    if (active_value.startsWith(SYMBOLS.FUNCTION_ARGS_START)) {
      for_args = token_active.value.split(';');
    }

    if (for_args.length !== 3) {
      return;
    }

    // Code
    token_active = inputTokens[++init_index];
    if (typeof token_active === 'undefined') {
      return;
    }
    if (token_active.type !== LEXER.Block) {
      return;
    }
    const for_code = token_active.raw.trim();

    return [for_args[0], for_args[1], for_args[2], for_code, init_index];
  }

  #parseIf(inputTokens: $ReadOnlyArray<TokenInfo>, index: number): IfParseInfo | void {
    let init_index: number = index;
    let else_code: string;
    const elif_codes: Array<[string, string]> = [];

    // Check
    let token_active = inputTokens[++init_index];
    if (typeof token_active === 'undefined') {
      return;
    }
    if (token_active.type !== LEXER.LogicBlock) {
      return;
    }
    const if_check = token_active.raw.trim();

    // Code
    token_active = inputTokens[++init_index];
    if (typeof token_active === 'undefined') {
      return;
    }
    if (token_active.type !== LEXER.Block) {
      return;
    }
    const if_code = token_active.raw.trim();

    token_active = inputTokens[++init_index];
    // Elif
    while (typeof token_active !== 'undefined' && token_active.type === LEXER.Elif) {
      // Check
      token_active = inputTokens[++init_index];
      if (token_active.type !== LEXER.LogicBlock) {
        break;
      }
      const elif_check = token_active.raw.trim();
      // Code
      token_active = inputTokens[++init_index];
      if (typeof token_active === 'undefined') {
        return;
      }
      if (token_active.type !== LEXER.Block) {
        return;
      }
      const elif_code = token_active.raw.trim();

      elif_codes.push([elif_check, elif_code]);
      token_active = inputTokens[++init_index];
    }

    // Else
    if (typeof token_active !== 'undefined' && token_active.type === LEXER.Else) {
      token_active = inputTokens[++init_index];
      if (typeof token_active === 'undefined') {
        return;
      }
      if (token_active.type !== LEXER.Block) {
        return;
      }
      else_code = token_active.raw.trim();
    } else {
      --init_index;
    }

    return [if_check, if_code, elif_codes, else_code, init_index];
  }

  #appendParse(value: string, options: ParserOptions, res: ParseInfo, to_append: ParseStackInfo): ParseInfo {
    const parse_res = this.parse(
      value,
      options,
      res.maxULevel + 1,
    );
    res.stack.values.push(...parse_res.stack.values);
    res.stack.names.push(...parse_res.stack.names);
    to_append.inputTokens.push(...parse_res.inputTokens);
    to_append.instructions.push(...parse_res.stack.instructions);
    res.maxULevel = parse_res.maxULevel;
    return parse_res;
  }

  #parse(data: ParseInfo, stack_info: ParseStackInfo, token: TokenInfo, registeredCmds: RegisteredCMD | void): ParseInfo {
    const parse_info = this.parse(
      token.value,
      {
        registeredCmds: registeredCmds,
        silent: true,
        offset: token.start + 1,
      },
      data.maxULevel + 1,
    );
    data.stack.values.push(...parse_info.stack.values);
    data.stack.names.push(...parse_info.stack.names);
    stack_info.inputTokens.push(...parse_info.inputTokens);
    stack_info.instructions.push(...parse_info.stack.instructions);
    data.maxULevel = parse_info.maxULevel;
    return data;
  }

  /**
   * Create the execution stack
   * FIXME: This is getting a lot of complexity... need be refactored!
   * @param {String} data
   * @param {Boolean} need_reset_stores
   * @returns {Object}
   */
  parse(data: string, options: ParserOptions, level: number = 0): ParseInfo {
    const res: ParseInfo = {
      stack: {
        instructions: [],
        names: [[]],
        values: [[]],
      },
      inputTokens: [this.tokenize(data, options)],
      inputRawString: data,
      maxULevel: level,
    };

    const pushParseData = (parse_data: ParseStackInfo) => {
      res.stack.instructions.push(...parse_data.instructions);
      if (parse_data.values.length) {
        res.stack.values[0].push(...parse_data.values);
      }
      if (parse_data.names.length) {
        res.stack.names[0].push(...parse_data.names);
      }
      if (parse_data.inputTokens.length) {
        res.inputTokens.push(...parse_data.inputTokens);
      }

      parse_data.instructions = [];
      parse_data.values = [];
      parse_data.names = [];
      parse_data.inputTokens = [];
    };

    // Create Stack Entries
    const tokens_len = res.inputTokens[0].length;
    const to_append_eoc: ParseStackInfo = {
      instructions: [],
      names: [],
      values: [],
      inputTokens: [],
    };
    const to_append_eoi: ParseStackInfo = {
      instructions: [],
      names: [],
      values: [],
      inputTokens: [],
    };
    const to_append: ParseStackInfo = {
      instructions: [],
      names: [],
      values: [],
      inputTokens: [],
    };
    let silent = false;
    let sign_cache = null;
    let token_subindex = 0;
    let jump_instr_index = -1;
    for (let index = 0; index < tokens_len; ++index) {
      const token = res.inputTokens[0][index];
      let ignore_instr_eoi = false;
      switch (token.type) {
        case LEXER.Unknown:
          if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
            throw new InvalidTokenError(token.value, token.start, token.end);
          }
        case LEXER.Variable:
          {
            ignore_instr_eoi = true;
            to_append.names.push(token.value);
            const dindex = res.stack.names[0].length;
            to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_NAME, index, level, dindex));
            if (sign_cache !== null) {
              to_append.instructions.push(new Instruction(sign_cache, index, level));
              sign_cache = null;
            }
          }
          break;
        case LEXER.VariableCall:
          if (isFalsy(options?.isData)) {
            to_append.names.push(token.value);
            const dindex = res.stack.names[0].length;
            to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_NAME_CALLEABLE, index, level, dindex));
            const ninstr = new Instruction(
              !isFalsy(options?.silent) || silent ? INSTRUCTION_TYPE.CALL_FUNCTION_SILENT : INSTRUCTION_TYPE.CALL_FUNCTION,
              -1,
              level,
            );
            if (token_subindex === 0) {
              to_append_eoc.instructions.push(ninstr);
            } else {
              to_append.instructions.push(ninstr);
            }
          } else if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
            throw new InvalidTokenError(token.value, token.start, token.end);
          }
          break;
        case LEXER.ArgumentLong:
        case LEXER.ArgumentShort:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.LOAD_ARG, index, level, -1),
          );
          break;
        case LEXER.Negative:
          sign_cache = INSTRUCTION_TYPE.UNITARY_NEGATIVE;
          continue;
        case LEXER.Add:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.ADD, index, level));
          break;
        case LEXER.Substract:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.SUBSTRACT, index, level));
          break;
        case LEXER.Multiply:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.MULTIPLY, index, level));
          break;
        case LEXER.Divide:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.DIVIDE, index, level));
          break;
        case LEXER.Modulo:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.MODULO, index, level));
          break;
        case LEXER.Pow:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.POW, index, level));
          break;
        case LEXER.And:
          ignore_instr_eoi = true;
          jump_instr_index = to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_IF_FALSE, index, level, -1));
          jump_instr_index += res.stack.instructions.length;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.AND, index, level));
          break;
        case LEXER.Or:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.OR, index, level));
          break;
        case LEXER.Not:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.NOT, index, level));
          break;
        case LEXER.Equal:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.EQUAL, index, level));
          break;
        case LEXER.NotEqual:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.NOT_EQUAL, index, level));
          break;
        case LEXER.GreaterThanOpen:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.GREATER_THAN_OPEN, index, level));
          break;
        case LEXER.LessThanOpen:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.LESS_THAN_OPEN, index, level));
          break;
        case LEXER.GreaterThanClosed:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.GREATER_THAN_CLOSED, index, level));
          break;
        case LEXER.LessThanClosed:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(new Instruction(INSTRUCTION_TYPE.LESS_THAN_CLOSED, index, level));
          break;
        case LEXER.Number:
          {
            to_append.values.push(Number(token.value));
            const dindex = res.stack.values[0].length;
            to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index, level, dindex));
            if (sign_cache !== null) {
              to_append.instructions.push(new Instruction(sign_cache, index, level));
              sign_cache = null;
            }
          }
          break;
        case LEXER.Boolean:
          {
            to_append.values.push(token.value.toLocaleLowerCase() === 'true');
            const dindex = res.stack.values[0].length;
            to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index, level, dindex));
          }
          break;
        case LEXER.Null:
            {
              to_append.values.push(null);
              const dindex = res.stack.values[0].length;
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index, level, dindex));
            }
            break;
        case LEXER.Function:
          {
            const result = this.#parseFunction(res.inputTokens[0], index, options);
            if (typeof result === 'undefined') {
              if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                throw new InvalidTokenError(token.value, token.start, token.end);
              }
            } else {
              const [fun_name, fun_args, fun_code, uindex] = result;
              let dindex = res.stack.values[0].length;
              // Function Code
              to_append.values.push(this.parse(fun_code, options));
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index, level, dindex));
              // Function Args
              to_append.values.push(fun_args);
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index, level, ++dindex));
              // Function Name
              to_append.values.push(fun_name);
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index+1, level, ++dindex));
              // Make Function
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.MAKE_FUNCTION, -1, level, -1));
              index = uindex;
            }
          }
          break;
        case LEXER.Return:
          {
            ignore_instr_eoi = true;
            const next_token = res.inputTokens[0][index + 1];
            if (typeof next_token === 'undefined' || next_token.type === LEXER.Delimiter) {
              to_append.values.push(null);
              const dindex = res.stack.values[0].length;
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index, level, dindex));
            }
            to_append_eoc.instructions.push(new Instruction(INSTRUCTION_TYPE.RETURN_VALUE, -1, -1));
          }
          break;
        case LEXER.Silent:
          silent = true;
          --token_subindex;
          break;
        case LEXER.If:
          {
            const result = this.#parseIf(res.inputTokens[0], index);
            if (typeof result === 'undefined') {
              if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                throw new InvalidTokenError(token.value, token.start, token.end);
              }
            } else {
              const jump_refs = [];
              const [if_check, if_code, elif_codes, else_code, uindex] = result;

              // Check
              this.#appendParse(
                if_check,
                {
                  registeredCmds: options.registeredCmds,
                  silent: true,
                  offset: token.start + 1,
                  noReturn: true,
                  ignoreErrors: options.ignoreErrors,
                },
                res,
                to_append,
              );
              const ref_if_instr_index = to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_IF_FALSE, index, level, -1));

              // Code
              const parsed_if_block = this.#appendParse(
                if_code,
                {
                  registeredCmds: options.registeredCmds,
                  silent: false,
                  offset: token.start + 1,
                  noReturn: true,
                  ignoreErrors: options.ignoreErrors,
                },
                res,
                to_append,
              );
              if (parsed_if_block) {
                jump_refs.push(
                  to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_FORWARD, index, level, -1))
                );
                to_append.instructions[ref_if_instr_index - 1].meta = parsed_if_block.stack.instructions.length + 1;
              } else if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                throw new InvalidTokenError(token.value, token.start, token.end);
              }

              // Elif Codes
              for (const [elif_check, elif_code] of elif_codes) {
                // Check
                this.#appendParse(
                  elif_check,
                  {
                    registeredCmds: options.registeredCmds,
                    silent: true,
                    offset: token.start + 1,
                    noReturn: true,
                    ignoreErrors: options.ignoreErrors,
                  },
                  res,
                  to_append,
                );
                const ref_elif_instr_index = to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_IF_FALSE, index, level, -1));

                // Code
                const parsed_elif_block = this.#appendParse(
                  elif_code,
                  {
                    registeredCmds: options.registeredCmds,
                    silent: false,
                    offset: token.start + 1,
                    noReturn: true,
                    ignoreErrors: options.ignoreErrors,
                  },
                  res,
                  to_append,
                );
                if (parsed_elif_block) {
                  jump_refs.push(
                    to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_FORWARD, index, level, -1))
                  );
                  to_append.instructions[ref_elif_instr_index - 1].meta = parsed_elif_block.stack.instructions.length + 1;
                } else if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                  throw new InvalidTokenError(token.value, token.start, token.end);
                }
              }

              // Else Code
              if (typeof else_code !== 'undefined') {
                const ref_else_instr_index = to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_IF_TRUE, index, level, -1));
                // Code
                const parsed_else_block = this.#appendParse(
                  else_code,
                  {
                    registeredCmds: options.registeredCmds,
                    silent: false,
                    offset: token.start + 1,
                    noReturn: true,
                    ignoreErrors: options.ignoreErrors,
                  },
                  res,
                  to_append,
                );
                if (parsed_else_block) {
                  to_append.instructions[ref_else_instr_index - 1].meta = parsed_else_block.stack.instructions.length;
                } else if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                  throw new InvalidTokenError(token.value, token.start, token.end);
                }
              }

              // Set Jumps
              for (const jump_ref of jump_refs) {
                to_append.instructions[jump_ref - 1].meta = to_append.instructions.length - jump_ref;
              }

              index = uindex;
            }
          }
          break;
        case LEXER.For:
          {
            const result = this.#parseLoopFor(res.inputTokens[0], index);
            if (typeof result === 'undefined') {
              if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                throw new InvalidTokenError(token.value, token.start, token.end);
              }
            } else {
              const [for_init, for_check, for_iter, for_code, uindex] = result;
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.PUSH_FRAME, index, level));

              // Init Code
              this.#appendParse(
                for_init,
                {
                  registeredCmds: options.registeredCmds,
                  silent: true,
                  offset: token.start + 1,
                  noReturn: true,
                  ignoreErrors: options.ignoreErrors,
                  delimiter: ',',
                },
                res,
                to_append,
              );
              const anchor_index = to_append.instructions.length;

              // Check Code
              this.#appendParse(
                for_check,
                {
                  registeredCmds: options.registeredCmds,
                  silent: true,
                  offset: token.start + 1,
                  noReturn: true,
                  ignoreErrors: options.ignoreErrors,
                },
                res,
                to_append,
              );
              const ref_check_instr_index = to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_IF_FALSE, index, level, -1));

              // Code
              const parsed_for_block = this.#appendParse(
                for_code,
                {
                  registeredCmds: options.registeredCmds,
                  silent: false,
                  offset: token.start + 1,
                  noReturn: true,
                  ignoreErrors: options.ignoreErrors,
                },
                res,
                to_append,
              );

              // Iter
              const parsed_iter_block = this.#appendParse(
                for_iter,
                {
                  registeredCmds: options.registeredCmds,
                  silent: true,
                  offset: token.start + 1,
                  noReturn: true,
                  ignoreErrors: options.ignoreErrors,
                  delimiter: ',',
                },
                res,
                to_append,
              );

              if (parsed_for_block && parsed_iter_block) {
                // Update JUMPS
                const parsed_instr_len = parsed_for_block.stack.instructions.length;
                for (let instr_index = 0; instr_index < parsed_instr_len; ++instr_index) {
                  const instr = parsed_for_block.stack.instructions[instr_index];
                  if (instr.type === INSTRUCTION_TYPE.JUMP_FORWARD) {
                    if (instr.meta === -2) {
                      instr.meta = (parsed_for_block.stack.instructions.length + parsed_iter_block.stack.instructions.length) - instr_index;
                    } else if (instr.meta === -1) {
                      instr.meta = parsed_for_block.stack.instructions.length - instr_index - 1;
                    }
                  }
                }
                to_append.instructions[ref_check_instr_index - 1].meta = parsed_for_block.stack.instructions.length + parsed_iter_block.stack.instructions.length + 1;
              } else if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                throw new InvalidTokenError(token.value, token.start, token.end);
              }
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_BACKWARD, index, level, to_append.instructions.length - anchor_index));
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.POP_FRAME, index, level));
              index = uindex;
            }
          }
          break;
        case LEXER.Break:
          to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_FORWARD, index, level, -2));
          break;
        case LEXER.Continue:
          to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.JUMP_FORWARD, index, level, -1));
          break;
        case LEXER.String:
        case LEXER.StringSimple:
          {
            const token_raw_san = token.raw.trim();
            if (
              isFalsy(options?.isData) &&
              token_subindex === 0 &&
              token_raw_san[0] !== SYMBOLS.STRING &&
              token_raw_san[0] !== SYMBOLS.STRING_SIMPLE
            ) {
              const can_name = this.getCanonicalCommandName(token.value, options.registeredCmds || {});
              const command_name = typeof can_name === 'undefined' ? token.value : can_name;
              to_append.names.push(command_name);
              const dindex = res.stack.names[0].length;
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_GLOBAL, index, level, dindex));
              to_append_eoc.instructions.push(
                new Instruction(
                  !isFalsy(options?.silent) || silent ? INSTRUCTION_TYPE.CALL_FUNCTION_SILENT : INSTRUCTION_TYPE.CALL_FUNCTION,
                  -1,
                  level,
                ),
              );
            } else {
              to_append.values.push(token.value);
              const dindex = res.stack.values[0].length;
              to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_CONST, index, level, dindex));
            }
          }
          break;
        case LEXER.Array:
          {
            const parsed_array = this.#appendParse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                isData: true,
                offset: token.start + 1,
                ignoreErrors: options.ignoreErrors,
              },
              res,
              to_append,
            );
            const dindex =
              parsed_array.inputTokens[0].filter(item => LEXERDATA.includes(item.type)).length - parsed_array.inputTokens[0].filter(item => LEXER_MATH_OPER.includes(item.type)).length;
            to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.BUILD_LIST, index, level, dindex));
          }
          break;
        case LEXER.Dictionary:
          {
            const parsed_dict = this.#appendParse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                isData: true,
                offset: token.start + 1,
                ignoreErrors: options.ignoreErrors,
              },
              res,
              to_append,
            );
            let dindex =
              parsed_dict.inputTokens[0].filter(item => LEXERDATA.includes(item.type)).length - parsed_dict.inputTokens[0].filter(item => LEXER_MATH_OPER.includes(item.type)).length;
            dindex = parseInt(dindex / 2, 10);
            to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.BUILD_MAP, index, level, dindex));
          }
          break;
        case LEXER.Assignment:
        case LEXER.AssignmentAdd:
        case LEXER.AssignmentSubstract:
        case LEXER.AssignmentMultiply:
        case LEXER.AssignmentDivide:
          {
            const last_instr = res.stack.instructions.pop();
            if (!last_instr || (last_instr.type !== INSTRUCTION_TYPE.LOAD_DATA_ATTR && last_instr.type !== INSTRUCTION_TYPE.LOAD_NAME)) {
              if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                throw new InvalidTokenError(token.value, token.start, token.end);
              }
            } else {
              const instr_type = last_instr.type === INSTRUCTION_TYPE.LOAD_DATA_ATTR ? INSTRUCTION_TYPE.STORE_SUBSCR : INSTRUCTION_TYPE.STORE_NAME;
              to_append_eoc.instructions.push(
                new Instruction(instr_type, index, level, res.stack.names[0].length - 1),
              );
            }
          }
          break;
        case LEXER.DataAttribute:
          {
            ignore_instr_eoi = true;
            const parsed_attribute = this.#appendParse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                isData: true,
                offset: token.start + 1,
                ignoreErrors: options.ignoreErrors,
              },
              res,
              to_append,
            );
            to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.LOAD_DATA_ATTR, index, level));
            const last_instr: Instruction | void = res.stack.instructions.at(-1);
            if (last_instr && last_instr.type === INSTRUCTION_TYPE.UNITARY_NEGATIVE) {
              const instr = res.stack.instructions.pop();
              if (!instr) {
                if (typeof options.ignoreErrors === 'undefined' || !options.ignoreErrors) {
                  throw new InvalidTokenError(token.value, token.start, token.end);
                }
              } else {
                to_append.instructions.push(instr);
              }
            }
            res.maxULevel = parsed_attribute.maxULevel;
          }
          break;
        case LEXER.Block:
          to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.PUSH_FRAME, index, level));
          this.#appendParse(
            token.value,
            {
              registeredCmds: options.registeredCmds,
              silent: false,
              offset: token.start + 1,
              noReturn: true,
              ignoreErrors: options.ignoreErrors,
            },
            res,
            to_append,
          );
          to_append.instructions.push(new Instruction(INSTRUCTION_TYPE.POP_FRAME, index, level));
          break;
        case LEXER.Space:
          ignore_instr_eoi = true;
          break;
        case LEXER.Delimiter:
          token_subindex = 0;
          break;
        case LEXER.LogicBlock:
          this.#appendParse(
            token.value,
            {
              registeredCmds: options.registeredCmds,
              silent: true,
              offset: token.start + 1,
              noReturn: true,
              ignoreErrors: options.ignoreErrors,
            },
            res,
            to_append,
          );
          if (sign_cache !== null) {
            to_append.instructions.push(new Instruction(sign_cache, index, level));
            sign_cache = null;
          }
          break;
      }

      pushParseData(to_append);
      if (index === tokens_len - 1 || !ignore_instr_eoi || token.type === LEXER.Delimiter) {
        if (jump_instr_index !== -1) {
          const rindex = jump_instr_index - 1;
          res.stack.instructions[rindex].meta = res.stack.instructions.length - rindex;
          jump_instr_index = -1;
        }

        pushParseData(to_append_eoi);
      }
      if (index === tokens_len - 1 || token.type === LEXER.Delimiter) {
        pushParseData(to_append_eoc);
        silent = false;
      }

      if (token.type !== LEXER.Space) {
        if (token.type !== LEXER.Delimiter) {
          ++token_subindex;
        }
      }
    }

    if ((options?.noReturn === false || typeof options?.noReturn === 'undefined') && level === 0) {
      const last_instr = res.stack.instructions.at(-1);
      if (typeof last_instr !== 'undefined' && last_instr.type !== INSTRUCTION_TYPE.RETURN_VALUE) {
        res.stack.instructions.push(new Instruction(INSTRUCTION_TYPE.RETURN_VALUE, -1, -1));
      }
    }

    return res;
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
