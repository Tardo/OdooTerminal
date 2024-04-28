// @flow strict
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
import InvalidValueError from './exceptions/invalid_value_error';
import NotExpectedCommandArgumentError from './exceptions/not_expected_command_argument_error';
import UnknownCommandError from './exceptions/unknown_command_error';
import UnknownNameError from './exceptions/unknown_name_error';
import Interpreter from './interpreter';
import pluck from './utils/pluck';
import isFalsy from './utils/is_falsy';
import type {RegisteredCMD, ParserOptions, CMDDef, ParseInfo, CMDCallbackArgs} from './interpreter';

export type ProcessCommandJobOptions = {
  cmdRaw: string,
  cmdName: string,
  cmdDef: CMDDef,
  kwargs: CMDCallbackArgs,
};
export type ProcessCommandJobCallback = (options: ProcessCommandJobOptions, silect: boolean) => Promise<mixed>;
export type VMachineOptions = {
  processCommandJob: ProcessCommandJobCallback,
  silent: boolean,
};

export type EvalOptions = {
  aliases: {[string]: string},
  isData?: boolean,
  silent?: boolean,
};

class Frame {
  cmd: string | void;
  store: {[string]: mixed};
  args: Array<string>;
  values: Array<mixed>;
  prevFrame: Frame | void;

  constructor(cmd_name: string | void, prev_frame: Frame | void) {
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
  #registeredNames: {[string]: mixed} = {};
  #interpreter: Interpreter;
  registeredCmds: RegisteredCMD = {};
  options: VMachineOptions;

  constructor(registered_cmds: RegisteredCMD, options: VMachineOptions) {
    this.registeredCmds = registered_cmds;
    this.options = options;
    this.#interpreter = new Interpreter();
  }

  parse(data: string, options?: ParserOptions, level?: number = 0): ParseInfo {
    const parse_options: ParserOptions = typeof options !== 'undefined' ? structuredClone(options) : {};
    parse_options.registeredCmds = this.registeredCmds;
    return this.#interpreter.parse(data, parse_options, level);
  }

  parseAliases(aliases: {[string]: string}, cmd_name: string, args: $ReadOnlyArray<string>): string | void {
    let alias_cmd = aliases[cmd_name];
    if (alias_cmd) {
      const params_len = args.length;
      let index = 0;
      while (index < params_len) {
        const re = new RegExp(`\\$${Number(index) + 1}(?:\\[[^\\]]+\\])?`, 'g');
        alias_cmd = alias_cmd.replaceAll(re, args[index]);
        ++index;
      }
      alias_cmd = alias_cmd.replaceAll(/\$\d+(?:\[([^\]]+)\])?/g, (_, group) => {
        return group || '';
      });
      return alias_cmd;
    }
    return undefined;
  }

  async #callFunction(aliases: {[string]: string}, frame: Frame, parse_info: ParseInfo, silent: boolean): mixed {
    if (typeof frame.cmd !== 'undefined') {
      const frame_cmd = frame.cmd;
      if (this.registeredCmds[frame_cmd]) {
        const cmd_def = this.registeredCmds[frame_cmd];
        const items_len = frame.values.length;
        if (frame.args.length > items_len) {
          throw new InvalidCommandArgumentsError(frame_cmd, frame.args);
        }
        let kwargs: {[string]: mixed} = {};
        const {values} = frame;
        for (let index = items_len - 1; index >= 0; --index) {
          let arg_name = frame.args.pop();
          if (!arg_name) {
            const arg_def = cmd_def.args[index];
            if (!arg_def) {
              throw new InvalidCommandArgumentValueError(frame_cmd, values[index]);
            }
            arg_name = arg_def[1][1];
          }
          kwargs[arg_name] = values[index];
        }

        try {
          kwargs = await validateAndFormatArguments(cmd_def, kwargs);
        } catch (err) {
          throw new InvalidCommandArgumentFormatError(err.message, frame_cmd);
        }

        return await this.options.processCommandJob(
          {
            cmdRaw: parse_info.inputRawString,
            cmdName: frame_cmd,
            cmdDef: cmd_def,
            kwargs: kwargs,
          },
          silent,
        );
      }

      // Alias
      // $FlowFixMe
      const alias_cmd = this.parseAliases(aliases, frame_cmd, frame.values);
      if (typeof alias_cmd !== 'undefined') {
        const ret_val = await this.eval(alias_cmd, {
          aliases: aliases,
        });
        return ret_val[0];
      }
    }
  }

  #checkGlobalName(global_name: string | null, aliases: {[string]: string}): boolean {
    if (global_name === null) {
      return false;
    }
    return Object.hasOwn(this.registeredCmds, global_name) || !isFalsy(aliases[global_name]);
  }

  async eval(cmd_raw: string, options?: Partial<EvalOptions>): Promise<Array<mixed>> {
    if (cmd_raw?.constructor !== String) {
      throw new Error('Invalid input!');
    }
    const opts: EvalOptions = {
      aliases: {},
      isData: false,
      silent: false,
      ...options,
    };
    const parse_info = this.parse(cmd_raw, {
      isData: opts.isData,
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
      const token = instr.inputTokenIndex >= 0 ? parse_info.inputTokens[instr.level][instr.inputTokenIndex] : {
        value: '',
        start: -1,
        end: -1,
      };
      switch (instr.type) {
        case INSTRUCTION_TYPE.LOAD_NAME:
          {
            const var_name = stack.names[instr.level][instr.dataIndex] || '';
            // Check stores
            if (last_frame && Object.hasOwn(last_frame.store, var_name)) {
              last_frame.values.push(last_frame.store[var_name]);
            } else if (Object.hasOwn(this.#registeredNames, var_name)) {
              last_frame.values.push(this.#registeredNames[var_name]);
            } else {
              throw new UnknownNameError(var_name, token.start, token.end);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_GLOBAL: {
          let cmd_name = stack.names[instr.level][instr.dataIndex];
          if (cmd_name === null || typeof cmd_name === 'undefined') {
            cmd_name = 'Undefined';
          } else if (this.#checkGlobalName(cmd_name, opts.aliases)) {
            last_frame = new Frame(cmd_name, last_frame);
            frames.push(last_frame);
            break;
          }
          throw new UnknownCommandError(cmd_name, token.start, token.end);
        }
        case INSTRUCTION_TYPE.LOAD_CONST:
          {
            const value = stack.values[instr.level][instr.dataIndex];
            last_frame.values.push(value);
          }
          break;
        case INSTRUCTION_TYPE.LOAD_ARG:
          {
            const arg = stack.arguments[instr.level][instr.dataIndex];
            if (!last_frame) {
              throw new NotExpectedCommandArgumentError(arg, token.start, token.end);
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
            const valB = last_frame.values.pop();
            const valA = last_frame.values.pop();
            // $FlowFixMe
            last_frame.values.push(`${valA}${valB}`);
          }
          break;
        case INSTRUCTION_TYPE.UNITARY_NEGATIVE:
          {
            const val = last_frame.values.pop();
            if (typeof val === 'number') {
              last_frame.values.push(val * -1);
            } else {
              throw new InvalidValueError(val);
            }
          }
          break;
        case INSTRUCTION_TYPE.ADD:
        case INSTRUCTION_TYPE.SUBSTRACT:
        case INSTRUCTION_TYPE.MULTIPLY:
        case INSTRUCTION_TYPE.DIVIDE:
        case INSTRUCTION_TYPE.MODULO:
        case INSTRUCTION_TYPE.POW:
          {
            const valB = last_frame.values.pop();
            const valA = last_frame.values.pop();
            if (typeof valB !== 'number') {
              throw new InvalidValueError(valB);
            }
            if (typeof valA !== 'number') {
              throw new InvalidValueError(valA);
            }
            if (instr.type === INSTRUCTION_TYPE.ADD) {
              last_frame.values.push(valA + valB);
            } else if (instr.type === INSTRUCTION_TYPE.SUBSTRACT) {
              last_frame.values.push(valA - valB);
            } else if (instr.type === INSTRUCTION_TYPE.MULTIPLY) {
              last_frame.values.push(valA * valB);
            } else if (instr.type === INSTRUCTION_TYPE.DIVIDE) {
              last_frame.values.push(valA / valB);
            } else if (instr.type === INSTRUCTION_TYPE.MODULO) {
              last_frame.values.push(valA % valB);
            } else if (instr.type === INSTRUCTION_TYPE.POW) {
              last_frame.values.push(Math.pow(valA, valB));
            }
          }
          break;
        case INSTRUCTION_TYPE.CALL_FUNCTION_SILENT:
        case INSTRUCTION_TYPE.CALL_FUNCTION:
          {
            const frame = frames.pop();
            // Subframes are executed in silent mode
            const ret = await this.#callFunction(
              opts.aliases,
              frame,
              parse_info,
              instr.type === INSTRUCTION_TYPE.CALL_FUNCTION_SILENT || opts.silent === true,
            );
            last_frame = frames.at(-1) || root_frame;
            last_frame.values.push(ret);
          }
          break;
        case INSTRUCTION_TYPE.RETURN_VALUE:
          return_values.push(last_frame.values.at(-1));
          break;
        case INSTRUCTION_TYPE.STORE_NAME:
          {
            const vname = stack.names[instr.level][instr.dataIndex];
            const vvalue = last_frame.values.pop();
            if (vname === null || typeof vname === 'undefined') {
              if (!token) {
                throw new InvalidInstructionError();
              }
              throw new InvalidNameError(token.value, token.start, token.end);
            } else if (typeof vvalue === 'undefined') {
              const value_instr = stack.instructions[index - 1];
              const value_token = parse_info.inputTokens[value_instr.level][value_instr.inputTokenIndex] || {};
              throw new InvalidTokenError(value_token.value, value_token.start, value_token.end);
            } else {
              last_frame.store[vname] = vvalue;
            }
          }
          break;
        case INSTRUCTION_TYPE.STORE_SUBSCR:
          {
            const vname = stack.names[instr.level][instr.dataIndex];
            const attr_value = last_frame.values.pop();
            const attr_name = last_frame.values.pop();
            const data = last_frame.values.pop();
            try {
              // $FlowFixMe
              data[attr_name] = attr_value;
              // $FlowFixMe
              last_frame.store[vname] = data;
            } catch (err) {
              throw new InvalidInstructionError(err.message);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_DATA_ATTR:
          {
            const attr_name = last_frame.values.pop();
            const index_value = last_frame.values.length - 1;
            const value = last_frame.values[index_value];

            if (value === null || typeof value === 'undefined') {
              throw new InvalidValueError(typeof attr_name === 'string' ? attr_name : 'Unknown');
            }

            let res_value = null;
            try {
              // $FlowFixMe
              res_value = value[attr_name];
            } catch (err) {
              // Do nothing
            }
            if (res_value === null || typeof res_value === 'undefined') {
              if (typeof attr_name === 'string' && isNaN(Number(attr_name)) && value instanceof Array) {
                res_value = pluck(value, attr_name);
                if (res_value.every(item => typeof item === 'undefined')) {
                  res_value = undefined;
                } else {
                  res_value = res_value.join(',');
                }
              }
            }
            last_frame.values[index_value] = res_value;
          }
          break;
        case INSTRUCTION_TYPE.BUILD_LIST:
          {
            const iter_count = instr.dataIndex;
            const value = [];
            for (let i = 0; i < iter_count; ++i) {
              value.push(last_frame.values.pop());
            }
            last_frame.values.push(value.reverse());
          }
          break;
        case INSTRUCTION_TYPE.BUILD_MAP:
          {
            const iter_count = instr.dataIndex;
            const value: {[mixed]: mixed} = {};
            for (let i = 0; i < iter_count; ++i) {
              const val = last_frame.values.pop();
              const key = last_frame.values.pop();
              value[key] = val;
            }
            last_frame.values.push(value);
          }
          break;
        case INSTRUCTION_TYPE.PUSH_FRAME:
          last_frame = new Frame(undefined, last_frame);
          frames.push(last_frame);
          break;
        case INSTRUCTION_TYPE.POP_FRAME:
          frames.pop();
          last_frame = frames.at(-1) || root_frame;
          break;
      }

      stack_instr_done.push(instr);
    }
    return return_values;
  }
}
