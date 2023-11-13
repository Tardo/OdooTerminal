// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

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
} from './constants';
import Instruction from './instruction';
import countBy from './utils/count_by';

/**
 * This is TraSH
 */
export default class Interpreter {
  #regexComments = new RegExp(/^(\s*)?\/\/.*|^(\s*)?\/\*.+\*\//gm);

  /**
   * Split and trim values
   * @param {String} text
   * @param {String} separator
   * @returns {Array}
   */
  splitAndTrim(text, separator = ',') {
    return text.split(separator).map(item => item.trim());
  }

  getCanonicalCommandName(cmd_name, registered_cmds) {
    if (Object.hasOwn(registered_cmds, cmd_name)) {
      return cmd_name;
    }

    const entries = Object.entries(registered_cmds);
    for (const [cname, cmd_def] of entries) {
      if (cmd_def.aliases.indexOf(cmd_name) !== -1) {
        return cname;
      }
    }

    return null;
  }

  /**
   * Split the input data into usable tokens
   * FIXME: This is getting a lot of complexity... need be refactored!
   * @param {String} data
   * @returns {Array}
   */
  tokenize(data, options) {
    // Remove comments
    const clean_data = data.replaceAll(this.#regexComments, '');
    let tokens = [];
    let value = '';
    let in_string = '';
    let in_array = 0;
    let in_dict = 0;
    let in_runner = 0;
    let in_block = 0;
    let do_cut = false;
    let do_skip = false;
    let prev_char_no_space = '';
    let prev_char = '';
    let prev_token = null;
    let prev_token_no_space = null;
    const clean_data_len = clean_data.length;
    for (let char_index = 0; char_index < clean_data_len; ++char_index) {
      const char = clean_data[char_index];
      const in_data_type = in_array || in_dict || in_runner || in_block;
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
            ++in_dict;
          } else if (in_dict && char === SYMBOLS.BLOCK_END) {
            --in_dict;
          } else if (
            prev_char === SYMBOLS.VARIABLE &&
            char === SYMBOLS.RUNNER_START
          ) {
            ++in_runner;
          } else if (in_runner && char === SYMBOLS.RUNNER_END) {
            --in_runner;
          } else if (char === SYMBOLS.MATH_BLOCK_START) {
            if (!in_data_type) {
              do_cut = true;
            }
            ++in_block;
          } else if (in_block && char === SYMBOLS.MATH_BLOCK_END) {
            --in_block;
          } else if (!in_data_type) {
            if (
              options.isData &&
              (char === SYMBOLS.ITEM_DELIMITER ||
                char === SYMBOLS.DICTIONARY_SEPARATOR ||
                prev_char === SYMBOLS.ITEM_DELIMITER ||
                prev_char === SYMBOLS.DICTIONARY_SEPARATOR)
            ) {
              do_cut = true;
            } else if (
              char === SYMBOLS.EOC ||
              char === SYMBOLS.EOL ||
              char === SYMBOLS.VARIABLE ||
              char === SYMBOLS.ASSIGNMENT ||
              char === SYMBOLS.CONCAT ||
              prev_char === SYMBOLS.EOC ||
              prev_char === SYMBOLS.EOL ||
              prev_char === SYMBOLS.ASSIGNMENT ||
              prev_char === SYMBOLS.CONCAT
            ) {
              do_cut = true;
            } else if (
              (prev_char !== SYMBOLS.SPACE && char === SYMBOLS.SPACE) ||
              (prev_char === SYMBOLS.SPACE && char !== SYMBOLS.SPACE)
            ) {
              do_cut = true;
            }
            if (options?.math) {
              if (
                SYMBOLS_MATH_OPER.includes(char) ||
                SYMBOLS_MATH_OPER.includes(prev_char_no_space)
              ) {
                do_cut = true;
              }
            }
          }
        }

        if (do_cut) {
          if (value) {
            prev_token = this.#lexer(value, prev_token_no_space, options);
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
      }
      prev_char = char;
      if (prev_char !== SYMBOLS.SPACE) {
        prev_char_no_space = prev_char;
      }
      do_skip = false;
    }
    if (value) {
      tokens.push(this.#lexer(value, prev_token, options));
    }

    if (options?.math) {
      tokens = this.#prioritizer(tokens);
    }

    const tokens_info = [];
    const tokens_len = tokens.length;
    let offset = options.offset || 0;
    for (let i = 0; i < tokens_len; ++i) {
      const [token_type, token, raw] = tokens[i];
      if (token_type === LEXER.Space) {
        offset += raw.length;
        continue;
      }
      tokens_info.push({
        value: token,
        raw: raw,
        type: token_type,
        start: offset,
        end: offset + raw.length,
        index: i,
      });
      offset += raw.length;
    }
    return tokens_info;
  }

  /**
   * Classify tokens
   * @param {Array} tokens
   */
  #lexer(token, prev_token_info, options) {
    // FIXME: New level of ugly implementation here... but works :/
    const isDict = stoken => {
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
    let token_san = token.trim();
    const token_san_lower = token_san.toLocaleLowerCase();
    let ttype = LEXER.String;
    if (!token_san) {
      if (token === SYMBOLS.EOL) {
        ttype = LEXER.Delimiter;
      } else {
        ttype = LEXER.Space;
      }
    } else if (
      !options?.math &&
      !options?.isData &&
      token_san[0] === SYMBOLS.ARGUMENT
    ) {
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
      token_san === SYMBOLS.ITEM_DELIMITER
    ) {
      ttype = LEXER.Delimiter;
    } else if (token_san === SYMBOLS.ASSIGNMENT) {
      ttype = LEXER.Assignment;
    } else if (
      token_san[0] === SYMBOLS.ARRAY_START &&
      token_san.at(-1) === SYMBOLS.ARRAY_END
    ) {
      token_san = token_san.substr(1, token_san.length - 2);
      token_san = token_san.trim();
      if (
        prev_token_info &&
        (prev_token_info[0] === LEXER.Variable ||
          prev_token_info[0] === LEXER.DataAttribute ||
          prev_token_info[0] === LEXER.Runner)
      ) {
        ttype = LEXER.DataAttribute;
      } else {
        ttype = LEXER.Array;
      }
    } else if (
      token_san[0] === SYMBOLS.BLOCK_START &&
      token_san.at(-1) === SYMBOLS.BLOCK_END
    ) {
      token_san = token_san.substr(1, token_san.length - 2);
      token_san = token_san.trim();
      if (isDict(token_san)) {
        ttype = LEXER.Dictionary;
      } else {
        ttype = LEXER.Block;
      }
    } else if (
      options?.math &&
      token_san[0] === SYMBOLS.MATH_BLOCK_START &&
      token_san.at(-1) === SYMBOLS.MATH_BLOCK_END
    ) {
      token_san = token_san.substr(1, token_san.length - 2);
      token_san = token_san.trim();
      ttype = LEXER.Math;
    } else if (
      token_san[0] === SYMBOLS.VARIABLE &&
      token_san[1] === SYMBOLS.RUNNER_START &&
      token_san[2] === SYMBOLS.MATH_START &&
      token_san.at(-1) === SYMBOLS.RUNNER_END &&
      token_san.at(-2) === SYMBOLS.MATH_END
    ) {
      ttype = LEXER.Math;
      token_san = token_san.substr(3, token_san.length - 5).trim();
    } else if (
      token_san[0] === SYMBOLS.VARIABLE &&
      token_san[1] === SYMBOLS.RUNNER_START &&
      token_san.at(-1) === SYMBOLS.RUNNER_END
    ) {
      ttype = LEXER.Runner;
      token_san = token_san.substr(2, token_san.length - 3).trim();
    } else if (token_san[0] === SYMBOLS.VARIABLE) {
      ttype = LEXER.Variable;
      token_san = token_san.substr(1);
    } else if (
      token_san[0] === SYMBOLS.STRING &&
      token_san.at(-1) === SYMBOLS.STRING
    ) {
      ttype = LEXER.String;
    } else if (
      token_san[0] === SYMBOLS.STRING_SIMPLE &&
      token_san.at(-1) === SYMBOLS.STRING_SIMPLE
    ) {
      ttype = LEXER.StringSimple;
    } else if (!isNaN(Number(token_san))) {
      ttype = LEXER.Number;
    } else if (
      token_san_lower === KEYWORDS.TRUE ||
      token_san_lower === KEYWORDS.FALSE
    ) {
      ttype = LEXER.Boolean;
    } else if (token_san_lower === KEYWORDS.FOR) {
      ttype = LEXER.ForLoop;
    } else if (token_san_lower === KEYWORDS.IN) {
      ttype = LEXER.In;
    } else if (options.math) {
      if (token_san === SYMBOLS.ADD) {
        if (!prev_token_info || LEXER_MATH_OPER.includes(prev_token_info[0])) {
          ttype = LEXER.Positive;
        } else {
          ttype = LEXER.Add;
        }
      } else if (token_san === SYMBOLS.SUBSTRACT) {
        if (!prev_token_info || LEXER_MATH_OPER.includes(prev_token_info[0])) {
          ttype = LEXER.Negative;
        } else {
          ttype = LEXER.Substract;
        }
      } else if (token_san === SYMBOLS.MULTIPLY) {
        ttype = LEXER.Multiply;
      } else if (token_san === SYMBOLS.DIVIDE) {
        ttype = LEXER.Divide;
      } else if (token_san === SYMBOLS.MODULO) {
        ttype = LEXER.Modulo;
      } else if (token_san === SYMBOLS.POW) {
        ttype = LEXER.Pow;
      }
    } else if (token_san === SYMBOLS.CONCAT) {
      ttype = LEXER.Concat;
    }

    if (ttype === LEXER.String || ttype === LEXER.StringSimple) {
      token_san = this.#trimQuotes(token_san);
    }
    return [ttype, token_san, token];
  }

  #getDataInstructions(tokens, from, inverse_search) {
    from = from || 0;
    const data_tokens = [];
    const push_token = function (token) {
      if (!LEXERDATA_EXTENDED.includes(token[0])) {
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

  #tokenList2str(tokens) {
    let res_str = '';
    for (const token of tokens) {
      res_str += token[0] === LEXER.Math ? `(${token[1]})` : token[2];
    }
    return res_str;
  }

  #prioritizer(tokens) {
    let tokens_no_spaces = tokens.filter(item => item[0] !== LEXER.Space);
    const tokens_math_oper = tokens_no_spaces.filter(item =>
      LEXER_MATH_OPER.includes(item[0]),
    );
    if (tokens_math_oper.length <= 1) {
      return tokens;
    }
    for (const tok_prio of MATH_OPER_PRIORITIES) {
      const ntokens = [];
      const tokens_len = tokens_no_spaces.length;
      for (let token_index = 0; token_index < tokens_len; ++token_index) {
        const [, token_val] = tokens_no_spaces[token_index];
        if (ntokens.length > 0 && token_val === tok_prio) {
          const prev_tokens = this.#getDataInstructions(
            ntokens,
            ntokens.length - 1,
            true,
            true,
          );
          const next_tokens = this.#getDataInstructions(
            tokens_no_spaces,
            token_index + 1,
            false,
            true,
          );
          const prev_tokens_str = this.#tokenList2str(prev_tokens);
          const next_tokens_str = this.#tokenList2str(next_tokens);
          for (let i = 0; i < prev_tokens.length; ++i) {
            ntokens.pop();
          }
          for (let i = 0; i < next_tokens.length; ++i) {
            ++token_index;
          }
          const fstr = `${prev_tokens_str}${token_val}${next_tokens_str}`;
          ntokens.push([LEXER.Math, fstr, `(${fstr})`]);
        } else {
          ntokens.push(tokens_no_spaces[token_index]);
        }
      }
      tokens_no_spaces = ntokens;
    }
    return tokens_no_spaces;
  }

  /**
   * Create the execution stack
   * FIXME: maybe RL?
   * FIXME: This is getting a lot of complexity... need be refactored!
   * @param {String} data
   * @param {Boolean} need_reset_stores
   * @returns {Object}
   */
  parse(data, options, level = 0) {
    let mlevel = level;
    const res = {
      stack: {
        instructions: [],
        names: [[]],
        values: [[]],
        arguments: [[]],
      },
      inputTokens: [this.tokenize(data, options)],
    };

    const pushParseData = parse_data => {
      res.stack.instructions.push(...parse_data.instructions);
      if (parse_data.arguments.length) {
        res.stack.arguments[0].push(...parse_data.arguments);
      }
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
      parse_data.arguments = [];
      parse_data.values = [];
      parse_data.names = [];
      parse_data.inputTokens = [];
    };

    // Create Stack Entries
    const tokens_len = res.inputTokens[0].length;
    const to_append_eoc = {
      instructions: [],
      names: [],
      values: [],
      arguments: [],
      inputTokens: [],
    };
    const to_append_eoi = {
      instructions: [],
      names: [],
      values: [],
      arguments: [],
      inputTokens: [],
    };
    const to_append = {
      instructions: [],
      names: [],
      values: [],
      arguments: [],
      inputTokens: [],
    };
    let num_concats = 0;
    let sign_cache = null;
    let last_token_index = -1;
    let token_subindex = 0;
    for (let index = 0; index < tokens_len; ++index) {
      const token = res.inputTokens[0][index];
      let ignore_instr_eoi = false;
      switch (token.type) {
        case LEXER.Variable:
          {
            ignore_instr_eoi = true;
            to_append.names.push(token.value);
            const dindex = res.stack.names[0].length;
            to_append.instructions.push(
              new Instruction(INSTRUCTION_TYPE.LOAD_NAME, index, level, dindex),
            );
            if (sign_cache) {
              to_append.instructions.push(
                new Instruction(sign_cache, index, level),
              );
              sign_cache = null;
            }
          }
          break;
        case LEXER.ArgumentLong:
        case LEXER.ArgumentShort:
          {
            to_append.arguments.push(token.value);
            const dindex = res.stack.arguments[0].length;
            to_append.instructions.push(
              new Instruction(INSTRUCTION_TYPE.LOAD_ARG, index, level, dindex),
            );
          }
          break;
        case LEXER.Concat:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.CONCAT, index, level),
          );
          ++num_concats;
          break;
        case LEXER.Negative:
          sign_cache = INSTRUCTION_TYPE.UNITARY_NEGATIVE;
          last_token_index = index;
          continue;
        case LEXER.Add:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.ADD, index, level),
          );
          break;
        case LEXER.Substract:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.SUBSTRACT, index, level),
          );
          break;
        case LEXER.Multiply:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.MULTIPLY, index, level),
          );
          break;
        case LEXER.Divide:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.DIVIDE, index, level),
          );
          break;
        case LEXER.Modulo:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.MODULO, index, level),
          );
          break;
        case LEXER.Pow:
          ignore_instr_eoi = true;
          to_append_eoi.instructions.push(
            new Instruction(INSTRUCTION_TYPE.POW, index, level),
          );
          break;
        case LEXER.Number:
          {
            to_append.values.push(Number(token.value));
            const dindex = res.stack.values[0].length;
            to_append.instructions.push(
              new Instruction(
                INSTRUCTION_TYPE.LOAD_CONST,
                index,
                level,
                dindex,
              ),
            );
            if (sign_cache) {
              to_append.instructions.push(
                new Instruction(sign_cache, index, level),
              );
              sign_cache = null;
            }
          }
          break;
        case LEXER.Boolean:
          {
            to_append.values.push(token.value.toLocaleLowerCase() === 'true');
            const dindex = res.stack.values[0].length;
            to_append.instructions.push(
              new Instruction(
                INSTRUCTION_TYPE.LOAD_CONST,
                index,
                level,
                dindex,
              ),
            );
          }
          break;
        case LEXER.String:
        case LEXER.StringSimple:
          {
            const token_raw_san = token.raw.trim();
            if (
              !options?.isData &&
              token_subindex === 0 &&
              token_raw_san[0] !== SYMBOLS.STRING &&
              token_raw_san[0] !== SYMBOLS.STRING_SIMPLE
            ) {
              const can_name = this.getCanonicalCommandName(
                token.value,
                options.registeredCmds,
              );
              const command_name = can_name || token.value;
              to_append.names.push(command_name);
              const dindex = res.stack.names[0].length;
              to_append.instructions.push(
                new Instruction(
                  INSTRUCTION_TYPE.LOAD_GLOBAL,
                  index,
                  level,
                  dindex,
                ),
              );
              to_append_eoc.instructions.push(
                new Instruction(
                  options?.silent
                    ? INSTRUCTION_TYPE.CALL_FUNCTION_SILENT
                    : INSTRUCTION_TYPE.CALL_FUNCTION,
                  -1,
                  level,
                ),
              );
            } else {
              to_append.values.push(token.value);
              const dindex = res.stack.values[0].length;
              to_append.instructions.push(
                new Instruction(
                  INSTRUCTION_TYPE.LOAD_CONST,
                  index,
                  level,
                  dindex,
                ),
              );
            }
          }
          break;
        case LEXER.Array:
          {
            const parsed_array = this.parse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                isData: true,
                offset: token.start + 1,
              },
              ++mlevel,
            );
            const dindex =
              parsed_array.inputTokens[0].filter(item =>
                LEXERDATA.includes(item.type),
              ).length - parsed_array.unions;
            res.stack.arguments.push(...parsed_array.stack.arguments);
            res.stack.values.push(...parsed_array.stack.values);
            res.stack.names.push(...parsed_array.stack.names);
            to_append.inputTokens.push(...parsed_array.inputTokens);
            to_append.instructions.push(...parsed_array.stack.instructions);
            to_append.instructions.push(
              new Instruction(
                INSTRUCTION_TYPE.BUILD_LIST,
                index,
                level,
                dindex,
              ),
            );
            mlevel = parsed_array.maxULevel;
          }
          break;
        case LEXER.Dictionary:
          {
            const parsed_dict = this.parse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                isData: true,
                offset: token.start + 1,
              },
              ++mlevel,
            );
            let dindex =
              parsed_dict.inputTokens[0].filter(item =>
                LEXERDATA.includes(item.type),
              ).length - parsed_dict.unions;
            dindex = parseInt(dindex / 2, 10);
            res.stack.arguments.push(...parsed_dict.stack.arguments);
            res.stack.values.push(...parsed_dict.stack.values);
            res.stack.names.push(...parsed_dict.stack.names);
            to_append.inputTokens.push(...parsed_dict.inputTokens);
            to_append.instructions.push(...parsed_dict.stack.instructions);
            to_append.instructions.push(
              new Instruction(INSTRUCTION_TYPE.BUILD_MAP, index, level, dindex),
            );
            mlevel = parsed_dict.maxULevel;
          }
          break;
        case LEXER.Assignment:
          {
            const last_instr = res.stack.instructions.at(-1);
            if (last_instr) {
              if (last_instr.type === INSTRUCTION_TYPE.LOAD_DATA_ATTR) {
                res.stack.instructions.pop();
                to_append_eoc.instructions.push(
                  new Instruction(
                    INSTRUCTION_TYPE.STORE_SUBSCR,
                    index,
                    level,
                    res.stack.names.length - 1,
                  ),
                );
              } else {
                res.stack.instructions.pop();
                let dindex = -1;
                if (last_instr.type === INSTRUCTION_TYPE.LOAD_NAME) {
                  dindex = res.stack.names[0].length - 1;
                } else {
                  to_append_eoc.names.push(undefined);
                  dindex = res.stack.names[0].length;
                }
                to_append_eoc.instructions.push(
                  new Instruction(
                    INSTRUCTION_TYPE.STORE_NAME,
                    last_token_index,
                    level,
                    dindex,
                  ),
                );
              }
            } else {
              to_append_eoc.names.push(undefined);
              const dindex = res.stack.names[0].length;
              to_append_eoc.instructions.push(
                new Instruction(
                  INSTRUCTION_TYPE.STORE_NAME,
                  last_token_index,
                  level,
                  dindex,
                ),
              );
            }
          }
          break;
        case LEXER.DataAttribute:
          {
            ignore_instr_eoi = true;
            const parsed_attribute = this.parse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                isData: true,
                offset: token.start + 1,
              },
              ++mlevel,
            );
            res.stack.arguments.push(...parsed_attribute.stack.arguments);
            res.stack.values.push(...parsed_attribute.stack.values);
            res.stack.names.push(...parsed_attribute.stack.names);
            to_append.inputTokens.push(...parsed_attribute.inputTokens);
            to_append.instructions.push(...parsed_attribute.stack.instructions);
            to_append.instructions.push(
              new Instruction(INSTRUCTION_TYPE.LOAD_DATA_ATTR, index, level),
            );
            const last_instr = res.stack.instructions.at(-1);
            if (last_instr.type === INSTRUCTION_TYPE.UNITARY_NEGATIVE) {
              const instr = res.stack.instructions.pop();
              to_append.instructions.push(instr);
            }
            mlevel = parsed_attribute.maxULevel;
          }
          break;
        case LEXER.Runner:
          {
            const parsed_runner = this.parse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                offset: token.start + 1,
              },
              ++mlevel,
            );
            res.stack.arguments.push(...parsed_runner.stack.arguments);
            res.stack.values.push(...parsed_runner.stack.values);
            res.stack.names.push(...parsed_runner.stack.names);
            to_append.inputTokens.push(...parsed_runner.inputTokens);
            to_append.instructions.push(...parsed_runner.stack.instructions);
            if (sign_cache) {
              to_append.instructions.push(
                new Instruction(sign_cache, index, level),
              );
              sign_cache = null;
            }
            mlevel = parsed_runner.maxULevel;
          }
          break;
        case LEXER.Block:
          {
            const parsed_block = this.parse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: false,
                offset: token.start + 1,
              },
              ++mlevel,
            );
            res.stack.arguments.push(...parsed_block.stack.arguments);
            res.stack.values.push(...parsed_block.stack.values);
            res.stack.names.push(...parsed_block.stack.names);
            to_append.inputTokens.push(...parsed_block.inputTokens);
            to_append.instructions.push(
              new Instruction(INSTRUCTION_TYPE.PUSH_FRAME, index, level),
            );
            to_append.instructions.push(...parsed_block.stack.instructions);
            to_append.instructions.push(
              new Instruction(INSTRUCTION_TYPE.POP_FRAME, index, level),
            );
            mlevel = parsed_block.maxULevel;
          }
          break;
        // Case LEXER.For: {
        //     for (
        //         const nindex = index + 1;
        //         nindex < tokens_len;
        //         ++nindex
        //     ) {
        //         ntoken = res.inputTokens[0][nindex];
        //         if (ntoken.type === LEXER.Space) {
        //             continue;
        //         }
        //         if (
        //             ntoken.type === LEXER.EOC ||
        //             ntoken.type === LEXER.Block
        //         ) {
        //             break;
        //         }

        //         //    2 GET_ITER
        //         //    >>    4 FOR_ITER                 6 (to 18)
        //         //    6 STORE_NAME               1 (aa)
        //     }
        // }
        case LEXER.Space:
          ignore_instr_eoi = true;
          break;
        case LEXER.Delimiter:
          token_subindex = -1;
          break;
        case LEXER.Math:
          {
            const parsed_math = this.parse(
              token.value,
              {
                registeredCmds: options.registeredCmds,
                silent: true,
                math: true,
                offset: token.start + 3,
              },
              ++mlevel,
            );
            res.stack.arguments.push(...parsed_math.stack.arguments);
            res.stack.values.push(...parsed_math.stack.values);
            res.stack.names.push(...parsed_math.stack.names);
            to_append.inputTokens.push(...parsed_math.inputTokens);
            to_append.instructions.push(...parsed_math.stack.instructions);
            if (sign_cache) {
              to_append.instructions.push(
                new Instruction(sign_cache, index, level),
              );
              sign_cache = null;
            }
            mlevel = parsed_math.maxULevel;
          }
          break;
      }

      pushParseData(to_append);
      if (
        index === tokens_len - 1 ||
        !ignore_instr_eoi ||
        token.type === LEXER.Delimiter
      ) {
        pushParseData(to_append_eoi);
      }
      if (index === tokens_len - 1 || token.type === LEXER.Delimiter) {
        pushParseData(to_append_eoc);
      }

      if (token.type !== LEXER.Space) {
        last_token_index = index;
        ++token_subindex;
      }
    }

    if (!options?.math && level === 0) {
      res.stack.instructions.push(
        new Instruction(INSTRUCTION_TYPE.RETURN_VALUE, -1, -1),
      );
    }

    return {
      inputRawString: data,
      inputTokens: res.inputTokens,
      unions: num_concats,
      stack: {
        instructions: res.stack.instructions,
        names: res.stack.names,
        values: res.stack.values,
        arguments: res.stack.arguments,
      },
      maxULevel: mlevel,
    };
  }

  /**
   * @param {String} str
   * @returns {String}
   */
  #trimQuotes(str) {
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
