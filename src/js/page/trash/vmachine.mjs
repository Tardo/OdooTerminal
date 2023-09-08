// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {validateAndFormatArguments} from './argument';
import {INSTRUCTION_TYPE} from './constants';
import InvalidCommandArgumentFormatError from './exceptions/invalid_command_argument_format_error';
import InvalidCommandArgumentValueError from './exceptions/invalid_command_argument_value_error';
import InvalidCommandArgumentsError from './exceptions/invalid_command_arguments_error';
import InvalidInstructionError from './exceptions/invalid_instruction_error';
import InvalidNameError from './exceptions/invalid_name_error';
import InvalidTokenError from './exceptions/invalid_token_error';
import NotExpectedCommandArgumentError from './exceptions/not_expected_command_argument_error';
import UndefinedValueError from './exceptions/undefined_value_error';
import UnknownCommandError from './exceptions/unknown_command_error';
import UnknownNameError from './exceptions/unknown_name_error';
import Interpreter from './interpreter';
import pluck from './utils/pluck';

class Frame {
  constructor(cmd_name, prev_frame) {
    this.cmd = cmd_name;
    this.store = {};
    this.args = [];
    this.values = [];
    this.prevFrame = prev_frame;

    if (this.prevFrame) {
      this.store = {...this.prevFrame.store};
    }
  }
}

export default class VMachine {
  #registeredCmds = {};
  #registeredNames = {};
  #interpreter = null;

  constructor(registered_cmds, options) {
    this.#registeredCmds = registered_cmds;
    this.options = options;
    this.#interpreter = new Interpreter();
  }

  get commands() {
    return this.#registeredCmds;
  }

  parse(data, options, level = 0) {
    return this.#interpreter.parse(
      data,
      Object.assign({}, options, {
        registeredCmds: this.#registeredCmds,
        registeredNames: this.#registeredNames,
      }),
      level,
    );
  }

  parseAliases(aliases, cmd_name, args) {
    let alias_cmd = aliases[cmd_name];
    if (alias_cmd) {
      const params_len = args.length;
      let index = 0;
      while (index < params_len) {
        const re = new RegExp(`\\$${Number(index) + 1}(?:\\[[^\\]]+\\])?`, 'g');
        alias_cmd = alias_cmd.replaceAll(re, args[index]);
        ++index;
      }
      alias_cmd = alias_cmd.replaceAll(
        /\$\d+(?:\[([^\]]+)\])?/g,
        (_, group) => {
          return group || '';
        },
      );
      return alias_cmd;
    }
    return null;
  }

  async #callFunction(aliases, frame, parse_info, silent) {
    const cmd_def = this.#registeredCmds[frame.cmd];
    if (cmd_def) {
      const items_len = frame.values.length;
      if (frame.args.length > items_len) {
        throw new InvalidCommandArgumentsError(frame.cmd, frame.args);
      }
      let kwargs = {};
      const {values} = frame;
      for (let index = items_len - 1; index >= 0; --index) {
        let arg_name = frame.args.pop();
        if (!arg_name) {
          const arg_def = cmd_def.args[index];
          if (!arg_def) {
            throw new InvalidCommandArgumentValueError(
              frame.cmd,
              values[index],
            );
          }
          arg_name = arg_def[1][1];
        }
        kwargs[arg_name] = values[index];
      }

      try {
        kwargs = await validateAndFormatArguments(cmd_def, kwargs);
      } catch (err) {
        throw new InvalidCommandArgumentFormatError(err.message, frame.cmd);
      }

      return await this.options.processCommandJob(
        {
          cmdRaw: parse_info.inputRawString,
          cmdName: frame.cmd,
          cmdDef: cmd_def,
          kwargs: kwargs,
        },
        silent,
      );
    }
    // Alias
    const alias_cmd = this.parseAliases(aliases, frame.cmd, frame.values);
    const ret_val = await this.eval(alias_cmd, {
      aliases: aliases,
    });
    return ret_val[0];
  }

  #checkGlobalName(global_name, aliases) {
    return (
      Object.hasOwn(this.#registeredCmds, global_name) || aliases[global_name]
    );
  }

  async eval(cmd_raw, options) {
    if (cmd_raw?.constructor.name !== 'String') {
      throw new Error('Invalid input!');
    }
    const parse_info = this.parse(cmd_raw, {
      isData: options?.isData,
    });
    const {stack} = parse_info;
    const stack_instr_len = stack.instructions.length;
    const stack_instr_done = [];
    const root_frame = new Frame();
    root_frame.store = this.#registeredNames;
    const frames = [];
    const return_values = [];
    let last_frame = root_frame;
    for (let index = 0; index < stack_instr_len; ++index) {
      const instr = stack.instructions[index];
      const token =
        instr.inputTokenIndex >= 0
          ? parse_info.inputTokens[instr.level][instr.inputTokenIndex]
          : null;
      switch (instr.type) {
        case INSTRUCTION_TYPE.LOAD_NAME:
          {
            const var_name = stack.names[instr.level][instr.dataIndex];

            // Check stores
            const frame = last_frame || root_frame;
            if (last_frame && Object.hasOwn(last_frame.store, var_name)) {
              frame.values.push(last_frame.store[var_name]);
            } else if (Object.hasOwn(root_frame.store, var_name)) {
              frame.values.push(root_frame.store[var_name]);
            } else if (Object.hasOwn(this.#registeredNames, var_name)) {
              frame.values.push(this.#registeredNames[var_name]);
            } else {
              throw new UnknownNameError(var_name, token.start, token.end);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_GLOBAL:
          {
            const cmd_name = stack.names[instr.level][instr.dataIndex];
            if (this.#checkGlobalName(cmd_name, options.aliases)) {
              last_frame = new Frame(cmd_name, last_frame);
              frames.push(last_frame);
            } else {
              throw new UnknownCommandError(cmd_name, token.start, token.end);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_CONST:
          {
            const frame = last_frame || root_frame;
            const value = stack.values[instr.level][instr.dataIndex];
            frame.values.push(value);
          }
          break;
        case INSTRUCTION_TYPE.LOAD_ARG:
          {
            const arg = stack.arguments[instr.level][instr.dataIndex];
            if (!last_frame) {
              throw new NotExpectedCommandArgumentError(
                arg,
                token.start,
                token.end,
              );
            }
            // Flag arguments can be implicit
            const next_instr = stack.instructions[index + 1];
            if (next_instr && next_instr.type > INSTRUCTION_TYPE.LOAD_CONST) {
              last_frame.values.push(true);
            }
            last_frame.args.push(arg);
          }
          break;
        case INSTRUCTION_TYPE.CONCAT:
          {
            const frame = last_frame || root_frame;
            const valB = frame.values.pop();
            const valA = frame.values.pop();
            frame.values.push(`${valA}${valB}`);
          }
          break;
        case INSTRUCTION_TYPE.UNITARY_NEGATIVE:
          {
            const frame = last_frame || root_frame;
            const val = frame.values.pop();
            frame.values.push(val * -1);
          }
          break;
        case INSTRUCTION_TYPE.ADD:
        case INSTRUCTION_TYPE.SUBSTRACT:
        case INSTRUCTION_TYPE.MULTIPLY:
        case INSTRUCTION_TYPE.DIVIDE:
        case INSTRUCTION_TYPE.MODULO:
        case INSTRUCTION_TYPE.POW:
          {
            const frame = last_frame || root_frame;
            const valB = frame.values.pop();
            const valA = frame.values.pop();
            if (instr.type === INSTRUCTION_TYPE.ADD) {
              frame.values.push(valA + valB);
            } else if (instr.type === INSTRUCTION_TYPE.SUBSTRACT) {
              frame.values.push(valA - valB);
            } else if (instr.type === INSTRUCTION_TYPE.MULTIPLY) {
              frame.values.push(valA * valB);
            } else if (instr.type === INSTRUCTION_TYPE.DIVIDE) {
              frame.values.push(valA / valB);
            } else if (instr.type === INSTRUCTION_TYPE.MODULO) {
              frame.values.push(valA % valB);
            } else if (instr.type === INSTRUCTION_TYPE.POW) {
              frame.values.push(Math.pow(valA, valB));
            }
          }
          break;
        case INSTRUCTION_TYPE.CALL_FUNCTION_SILENT:
        case INSTRUCTION_TYPE.CALL_FUNCTION:
          {
            const frame = frames.pop();
            // Subframes are executed in silent mode
            const ret = await this.#callFunction(
              options.aliases,
              frame,
              parse_info,
              instr.type === INSTRUCTION_TYPE.CALL_FUNCTION_SILENT ||
                options?.silent,
            );
            last_frame = frames.at(-1);
            if (last_frame) {
              last_frame.values.push(ret);
            } else {
              root_frame.values.push(ret);
            }
          }
          break;
        case INSTRUCTION_TYPE.RETURN_VALUE:
          {
            const frame = last_frame || root_frame;
            return_values.push(frame.values.at(-1));
          }
          break;
        case INSTRUCTION_TYPE.STORE_NAME:
          {
            const frame = last_frame || root_frame;
            const vname = stack.names[instr.level][instr.dataIndex];
            const vvalue = frame.values.pop();
            if (!vname) {
              if (!token) {
                throw new InvalidInstructionError();
              }
              throw new InvalidNameError(token.value, token.start, token.end);
            } else if (typeof vvalue === 'undefined') {
              const value_instr = stack.instructions[index - 1];
              const value_token =
                stack.inputTokens[value_instr.inputTokenIndex] || {};
              throw new InvalidTokenError(
                value_token.value,
                value_token.start,
                value_token.end,
              );
            }
            frame.store[vname] = vvalue;
          }
          break;
        case INSTRUCTION_TYPE.STORE_SUBSCR:
          {
            const frame = last_frame || root_frame;
            const vname = stack.names[instr.level][instr.datIndex];
            const attr_value = frame.values.pop();
            const attr_name = frame.values.pop();
            const data = frame.values.pop();
            try {
              data[attr_name] = attr_value;
              frame.store[vname] = data;
            } catch (err) {
              throw new InvalidInstructionError(err.message);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_DATA_ATTR:
          {
            const frame = last_frame || root_frame;
            const attr_name = frame.values.pop();
            const index_value = frame.values.length - 1;
            const value = frame.values[index_value];

            if (typeof value === 'undefined') {
              throw new UndefinedValueError(attr_name);
            }
            let res_value = value[attr_name];
            if (typeof res_value === 'undefined') {
              if (isNaN(Number(attr_name)) && value.constructor === Array) {
                res_value = pluck(value, attr_name);
                if (res_value.every(item => typeof item === 'undefined')) {
                  res_value = undefined;
                } else {
                  res_value = res_value.join(',');
                }
              }
            }
            frame.values[index_value] = res_value;
          }
          break;
        case INSTRUCTION_TYPE.BUILD_LIST:
          {
            const frame = last_frame || root_frame;
            const iter_count = instr.dataIndex;
            const value = [];
            for (let i = 0; i < iter_count; ++i) {
              value.push(frame.values.pop());
            }
            frame.values.push(value.reverse());
          }
          break;
        case INSTRUCTION_TYPE.BUILD_MAP:
          {
            const frame = last_frame || root_frame;
            const iter_count = instr.dataIndex;
            const value = {};
            for (let i = 0; i < iter_count; ++i) {
              const val = frame.values.pop();
              const key = frame.values.pop();
              value[key] = val;
            }
            frame.values.push(value);
          }
          break;
        case INSTRUCTION_TYPE.PUSH_FRAME:
          last_frame = new Frame(undefined, last_frame);
          frames.push(last_frame);
          break;
        case INSTRUCTION_TYPE.POP_FRAME:
          frames.pop();
          last_frame = frames.at(-1);
          break;
      }

      stack_instr_done.push(instr);
    }
    return return_values;
  }
}
