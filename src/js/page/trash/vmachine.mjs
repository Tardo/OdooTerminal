// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {validateAndFormatArguments, getArgumentInputCount, getArgumentInfoByName} from './argument';
import {INSTRUCTION_TYPE, ARG} from './constants';
import {default as FunctionTrash, FUNCTION_TYPE} from './function';
import Frame from './frame';
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
import InvalidCommandDefintionError from './exceptions/invalid_command_definition_error';
import pluck from './utils/pluck';
import isNumber from './utils/is_number';
import type {RegisteredCMD, CMDDef, ParseInfo, CMDCallbackArgs} from './interpreter';
import { SYMBOLS } from './constants.mjs';

export type ProcessCommandJobOptions = {
  cmdRaw: string,
  cmdName: string,
  cmdDef: CMDDef,
  kwargs: CMDCallbackArgs,
  args: Array<string>,
};
export type ProcessCommandJobCallback = (options: ProcessCommandJobOptions, silect: boolean) => Promise<mixed>;
export type VMachineOptions = {
  processCommandJob: ProcessCommandJobCallback,
  silent: boolean,
};

export type EvalOptions = {
  isData?: boolean,
  silent?: boolean,
  aliases: {[string]: string},
};

export default class VMachine {
  #registeredCmds: RegisteredCMD = {};
  #registeredNames: {[string]: mixed} = {};
  options: VMachineOptions;

  constructor(options: VMachineOptions) {
    this.options = options;
  }

  getRegisteredCmds(): RegisteredCMD {
    return this.#registeredCmds;
  }

  static makeCommand(cmd_def: Partial<CMDDef>): CMDDef {
    return {
      definition: i18n.t('terminal.cmd.default.definition', 'Undefined command'),
      callback: () => {
        return this.#fallbackExecuteCommand();
      },
      options: () => {
        return this.#fallbackCommandOptions();
      },
      detail: i18n.t('terminal.cmd.default.detail', "This command hasn't a properly detailed information"),
      args: [],
      secured: false,
      aliases: [],
      example: '',
      type: FUNCTION_TYPE.Command,
      ...cmd_def,
    };
  }

  cleanNames() {
    this.#registeredNames = {};
  }

  registerCommand(cmd: string, cmd_def: Partial<CMDDef>): CMDDef {
    this.#registeredCmds[cmd] = VMachine.makeCommand(cmd_def);
    return this.#registeredCmds[cmd];
  }

  static async #fallbackExecuteCommand(): Promise<> {
    throw new InvalidCommandDefintionError;
  }

  static async #fallbackCommandOptions(): Promise<$ReadOnlyArray<string>> {
    return [];
  }

  async #invokeFunction(opts: EvalOptions, frame: Frame, name: string, cmd_def: CMDDef, parse_info: ParseInfo, silent: boolean): Promise<mixed> {
    let kwargs: {[string]: mixed} = {};
    if (typeof cmd_def !== 'undefined') {
      const arg_defs = cmd_def.args.filter(arg => frame.args.filter(farg => farg in arg[1]).length)
      if (getArgumentInputCount(arg_defs) > frame.args.length) {
        throw new InvalidCommandArgumentsError(name, frame.args);
      }
      const items_len = Math.max(frame.values.length, frame.args.length);
      if (getArgumentInputCount(arg_defs, true) > items_len) {
        throw new InvalidCommandArgumentsError(name, frame.args);
      }
      let arg_def;
      const {values} = frame;
      for (let index = items_len - 1, adone = frame.values.length - 1; index >= 0; --index) {
        let arg_name = frame.args.pop();
        if (typeof arg_name === 'undefined' || !arg_name) {
          arg_def = cmd_def.args[index];
          if (!arg_def) {
            throw new InvalidCommandArgumentValueError(name, values[adone--]);
          }
          arg_name = arg_def[1][1];
        } else {
          arg_def = getArgumentInfoByName(cmd_def.args, arg_name);
          if (!arg_def) {
            throw new InvalidCommandArgumentValueError(name, values[adone--]);
          }
        }
        kwargs[arg_name] = arg_def.type === ARG.Flag ? true : values[adone--];
      }

      try {
        kwargs = await validateAndFormatArguments(cmd_def, kwargs, this, opts, frame);
      } catch (err) {
        throw new InvalidCommandArgumentFormatError(err.message, name);
      }

      if (cmd_def.type !== FUNCTION_TYPE.Command) {
        if (typeof cmd_def.callback === 'undefined') {
          throw new InvalidCommandDefintionError();
        }
        let internal_res;
        try {
          // $FlowFixMe
          internal_res = await cmd_def.callback(this, kwargs, frame, opts);
        } catch (err) {
          if (!silent) {
            throw err;
          }
          return null;
        }
        return internal_res;
      }
    }

    return await this.options.processCommandJob(
      {
        cmdRaw: parse_info.inputRawString,
        cmdName: name,
        cmdDef: cmd_def,
        kwargs: kwargs,
        args: frame.values.map(item => new String(item).toString()),
      },
      silent,
    );
  }

  async execute(parse_info: ParseInfo, opts: EvalOptions, aframe?: Frame): Promise<mixed> {
    const {stack} = parse_info;
    const stack_instr_len = stack.instructions.length;
    let root_frame = aframe;
    if (typeof root_frame === 'undefined') {
      root_frame = new Frame();
      root_frame.store = this.#registeredNames;
    }
    const frames = [];
    let eoe = false;
    let last_frame = root_frame;
    for (let index = 0; !eoe && index < stack_instr_len; ++index) {
      const instr = stack.instructions[index];
      const token =
        instr.inputTokenIndex >= 0
          ? parse_info.inputTokens[instr.level][instr.inputTokenIndex]
          : {
              value: '',
              start: -1,
              end: -1,
            };
      switch (instr.type) {
        case INSTRUCTION_TYPE.LOAD_NAME_CALLEABLE:
        case INSTRUCTION_TYPE.LOAD_NAME:
          {
            const var_name = stack.names[instr.level][instr.dataIndex] || '';
            if (instr.type === INSTRUCTION_TYPE.LOAD_NAME_CALLEABLE) {
              last_frame = new Frame('__anon__', last_frame);
              frames.push(last_frame);
            }
            // Check stores
            try {
              const store_val = last_frame.getStoreValue(var_name);
              last_frame.values.push(store_val);
            } catch (_err) {
              throw new UnknownNameError(var_name, token.start, token.end);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_GLOBAL:
          {
            const cmd_name = stack.names[instr.level][instr.dataIndex];
            if (cmd_name === null || typeof cmd_name === 'undefined') {
              throw new UnknownNameError(i18n.t('UnknownNameError.invalidName', '<InvalidName>'), token.start, token.end)
            } else if (Object.hasOwn(this.#registeredCmds, cmd_name) || cmd_name in opts.aliases) {
              last_frame = new Frame(cmd_name, last_frame);
              frames.push(last_frame);
            } else {
              throw new UnknownCommandError(cmd_name, token.start, token.end);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_CONST:
          {
            const value = stack.values[instr.level][instr.dataIndex];
            last_frame.values.push(value);
          }
          break;
        case INSTRUCTION_TYPE.LOAD_ARG:
          {
            const arg_name = token.value;
            if (!last_frame) {
              throw new NotExpectedCommandArgumentError(arg_name, token.start, token.end);
            }
            if (typeof arg_name === 'string') {
              last_frame.args.push(arg_name);
            } else {
              throw new InvalidValueError(arg_name);
            }
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
          {
            const valB = last_frame.values.pop();
            const valA = last_frame.values.pop();
            if (typeof valB !== 'number' && typeof valB !== 'string') {
              throw new InvalidValueError(valB);
            }
            if (typeof valA !== 'number' && typeof valA !== 'string') {
              throw new InvalidValueError(valA);
            }
            last_frame.values.push(valA + valB);
          }
          break;
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
            if (instr.type === INSTRUCTION_TYPE.SUBSTRACT) {
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
        case INSTRUCTION_TYPE.AND:
        case INSTRUCTION_TYPE.OR:
        case INSTRUCTION_TYPE.EQUAL:
        case INSTRUCTION_TYPE.NOT_EQUAL:
          {
            const valB = last_frame.values.pop();
            const valA = last_frame.values.pop();
            if (instr.type === INSTRUCTION_TYPE.AND) {
              // $FlowIgnore
              last_frame.values.push(valA && valB);
            } else if (instr.type === INSTRUCTION_TYPE.OR) {
              // $FlowIgnore
              last_frame.values.push(valA || valB);
            } else if (instr.type === INSTRUCTION_TYPE.EQUAL) {
              last_frame.values.push(valA === valB);
            } else if (instr.type === INSTRUCTION_TYPE.NOT_EQUAL) {
              last_frame.values.push(valA !== valB);
            }
          }
          break;
        case INSTRUCTION_TYPE.GREATER_THAN_OPEN:
        case INSTRUCTION_TYPE.LESS_THAN_OPEN:
        case INSTRUCTION_TYPE.GREATER_THAN_CLOSED:
        case INSTRUCTION_TYPE.LESS_THAN_CLOSED:
          {
            const valB = last_frame.values.pop();
            const valA = last_frame.values.pop();

            if (typeof valB !== 'number') {
              throw new InvalidValueError(valB);
            }
            if (typeof valA !== 'number') {
              throw new InvalidValueError(valA);
            }

            if (instr.type === INSTRUCTION_TYPE.GREATER_THAN_OPEN) {
              last_frame.values.push(valA > valB);
            } else if (instr.type === INSTRUCTION_TYPE.LESS_THAN_OPEN) {
              last_frame.values.push(valA < valB);
            } else if (instr.type === INSTRUCTION_TYPE.GREATER_THAN_CLOSED) {
              last_frame.values.push(valA >= valB);
            } else if (instr.type === INSTRUCTION_TYPE.LESS_THAN_CLOSED) {
              last_frame.values.push(valA <= valB);
            }
          }
          break;
        case INSTRUCTION_TYPE.NOT:
          {
            const val = last_frame.values.pop();
            last_frame.values.push(!val);
          }
          break;
        case INSTRUCTION_TYPE.CALL_FUNCTION_SILENT:
        case INSTRUCTION_TYPE.CALL_FUNCTION:
          {
            const frame = frames.pop();
            // Subframes are executed in silent mode
            if (typeof frame?.cmd !== 'undefined') {
              const frame_cmd = frame.cmd;
              let cmd_def = this.#registeredCmds[frame_cmd];
              if (typeof cmd_def === 'undefined') {
                // FIXME: Done in this way to support 'aliases'
                if (!(frame_cmd in opts.aliases) && typeof frame.values[0] === 'object') {
                  // $FlowFixMe
                  cmd_def = frame.values.shift();
                }
              }
              // Subframes are executed in silent mode
              const ret = await this.#invokeFunction(
                opts,
                frame,
                frame_cmd,
                // $FlowFixMe
                cmd_def,
                parse_info,
                instr.type === INSTRUCTION_TYPE.CALL_FUNCTION_SILENT || opts.silent === true,
              );
              last_frame = frames.at(-1) || root_frame;
              last_frame.values.push(ret);
            }
          }
          break;
        case INSTRUCTION_TYPE.RETURN_VALUE:
          {
            const frame = frames.pop() || root_frame;
            last_frame = frames.at(-1) || root_frame;
            last_frame.values.push(frame.values.pop());
            eoe = true;
          }
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
              if (token.value === SYMBOLS.ASSIGNMENT_ADD || token.value === SYMBOLS.ASSIGNMENT_SUBSTRACT || token.value === SYMBOLS.ASSIGNMENT_MULTIPLY || token.value === SYMBOLS.ASSIGNMENT_DIVIDE) {
                let stored_value = last_frame.getStoreValue(vname);
                if (typeof stored_value === 'undefined') {
                  throw new InvalidNameError(vname, token.start, token.end);
                }

                if (token.value === SYMBOLS.ASSIGNMENT_ADD) {
                  // $FlowFixMe
                  stored_value += vvalue;
                } else if (token.value === SYMBOLS.ASSIGNMENT_SUBSTRACT) {
                  // $FlowFixMe
                  stored_value -= vvalue;
                } else if (token.value === SYMBOLS.ASSIGNMENT_MULTIPLY) {
                  // $FlowFixMe
                  stored_value *= vvalue;
                } else if (token.value === SYMBOLS.ASSIGNMENT_DIVIDE) {
                  // $FlowFixMe
                  stored_value /= vvalue;
                }
                last_frame.setStoreValue(vname, stored_value);
              } else {
                last_frame.setStoreValue(vname, vvalue);
              }
            }
          }
          break;
        case INSTRUCTION_TYPE.STORE_SUBSCR:
          {
            // const vname = stack.names[instr.level][instr.dataIndex];
            const attr_value = last_frame.values.pop();
            const attr_name = last_frame.values.pop();
            const data = last_frame.values.pop();
            try {
              if (token.value === SYMBOLS.ASSIGNMENT_ADD) {
                // $FlowFixMe
                data[attr_name] += attr_value;
              } else if (token.value === SYMBOLS.ASSIGNMENT_SUBSTRACT) {
                // $FlowFixMe
                data[attr_name] -= attr_value;
              } else if (token.value === SYMBOLS.ASSIGNMENT_MULTIPLY) {
                // $FlowFixMe
                data[attr_name] *= attr_value;
              } else if (token.value === SYMBOLS.ASSIGNMENT_DIVIDE) {
                // $FlowFixMe
                data[attr_name] /= attr_value;
              } else {
                // $FlowFixMe
                data[attr_name] = attr_value;
              }
              // last_frame.setStoreValue(vname, data);
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
            } catch (_err) {
              // Do nothing
            }
            if (res_value === null || typeof res_value === 'undefined') {
              if (typeof attr_name === 'string' && !isNumber(attr_name) && value instanceof Array) {
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
        case INSTRUCTION_TYPE.MAKE_FUNCTION:
          {
            const name = last_frame.values.pop();
            const args = last_frame.values.pop();
            const code = last_frame.values.pop();
            if (args instanceof Array && code !== null && typeof code === 'object') {
              // $FlowFixMe
              const trash_func = new FunctionTrash(args, code);
              const cmd_def = {
                // $FlowFixMe
                callback: trash_func.exec.bind(trash_func),
                type: FUNCTION_TYPE.Native,
                args: args,
                definition: i18n.t('trash.vmachine.func.definition', 'Internal function'),
                detail: i18n.t('trash.vmachine.func.detail', 'Internal function'),
              };
              if (typeof name === 'string') {
                this.registerCommand(name, cmd_def)
              }
              last_frame.values.push(cmd_def);
            }
          }
          break;
        case INSTRUCTION_TYPE.JUMP_IF_FALSE:
          {
            last_frame.lastFlowCheck = last_frame.values.at(-1);
            const num_to_skip = instr.dataIndex;
            if (typeof last_frame.lastFlowCheck === 'undefined' || last_frame.lastFlowCheck === null || !last_frame.lastFlowCheck) {
              index += num_to_skip;
            }
          }
          break;
        case INSTRUCTION_TYPE.JUMP_IF_TRUE:
          {
            const num_to_skip = instr.dataIndex;
            if (typeof last_frame.lastFlowCheck !== 'undefined' && last_frame.lastFlowCheck !== null && last_frame.lastFlowCheck) {
              index += num_to_skip;
            }
          }
          break;
        case INSTRUCTION_TYPE.JUMP_BACKWARD:
          {
            const num_to_back = instr.dataIndex;
            index -= num_to_back + 1;
          }
          break;
        case INSTRUCTION_TYPE.JUMP_FORWARD:
          {
            const num_to_adv = instr.dataIndex;
            if (num_to_adv > 0) {
              index += num_to_adv;
            }
          }
          break;
      }
    }
    return last_frame.values.pop();
  }
}
