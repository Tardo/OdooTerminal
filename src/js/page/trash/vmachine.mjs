// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {validateAndFormatArguments, getArgumentInputCount, getArgumentInfoByName} from './argument';
import {INSTRUCTION_TYPE, ARG, LEXER} from './constants';
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
import type {RegisteredCMD, CMDDef, ParseInfo, CMDCallbackArgs, TokenInfo, ArgDef} from './interpreter';
import type Instruction from './instruction';

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

// Placeholder used when an instruction has no source token attached
const DEFAULT_TOKEN: TokenInfo = {
  value: '',
  raw: '',
  type: LEXER.Unknown,
  start: -1,
  end: -1,
  index: -1,
};

export default class VMachine {
  #registeredCmds: RegisteredCMD = {};
  #globals: {[string]: mixed} = {};
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
      unsafe: false,
      aliases: [],
      example: '',
      type: FUNCTION_TYPE.Command,
      ...cmd_def,
    };
  }

  cleanGlobals() {
    this.#globals = {};
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

  async #genKwargs(opts: EvalOptions, frame: Frame, name: string, cmd_def: CMDDef): Promise<{[string]: mixed}> {
    let kwargs: {[string]: mixed} = {};
    // Resolve each named argument to its first matching definition (same
    // resolution as getArgumentInfoByName, which tolerates duplicated names)
    const arg_defs: Array<ArgDef> = [];
    for (const farg of frame.args) {
      const matched_def = cmd_def.args.find(arg => arg[1].includes(farg));
      if (typeof matched_def !== 'undefined' && !arg_defs.includes(matched_def)) {
        arg_defs.push(matched_def);
      }
    }
    if (getArgumentInputCount(arg_defs) > frame.args.length) {
      throw new InvalidCommandArgumentsError(name, frame.args);
    }
    const items_len = Math.max(frame.stack.length, frame.args.length);
    if (getArgumentInputCount(arg_defs, true) > items_len) {
      throw new InvalidCommandArgumentsError(name, frame.args);
    }
    let arg_def;
    const {stack} = frame;
    for (let index = items_len - 1, adone = stack.length - 1; index >= 0; --index) {
      let arg_name = frame.args.pop();
      if (typeof arg_name === 'undefined' || !arg_name) {
        arg_def = cmd_def.args[index];
        if (!arg_def) {
          throw new InvalidCommandArgumentValueError(name, stack[adone--]);
        }
        arg_name = arg_def[1][1];
      } else {
        arg_def = getArgumentInfoByName(cmd_def.args, arg_name);
        if (!arg_def) {
          throw new InvalidCommandArgumentValueError(name, stack[adone--]);
        }
      }
      kwargs[arg_name] = arg_def.type === ARG.Flag ? true : stack[adone--];
    }

    try {
      kwargs = await validateAndFormatArguments(cmd_def, kwargs, this, opts, frame);
    } catch (err) {
      throw new InvalidCommandArgumentFormatError(err.message, name);
    }
    return kwargs;
  }

  async #invokeFunction(opts: EvalOptions, frame: Frame, name: string, cmd_def: CMDDef, parse_info: ParseInfo, silent: boolean): Promise<mixed> {
    let kwargs: {[string]: mixed} = {};
    if (typeof cmd_def !== 'undefined') {
      kwargs = await this.#genKwargs(opts, frame, name, cmd_def);
      if (cmd_def.type !== FUNCTION_TYPE.Command) {
        if (typeof cmd_def.callback === 'undefined') {
          throw new InvalidCommandDefintionError();
        }
        let internal_res;
        try {
          const internal_cb = cmd_def.callback;
          // $FlowFixMe[extra-arg]
          // $FlowFixMe[class-object-subtyping]
          internal_res = await internal_cb(this, kwargs, frame, opts);
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
        args: frame.stack.map(item => String(item)),
      },
      silent,
    );
  }

  async execute(parse_info: ParseInfo, opts: EvalOptions, aframe?: Frame, collectAll?: boolean): Promise<mixed> {
    const {program} = parse_info;
    const instrLen = program.instructions.length;
    let rootFrame = aframe;
    if (typeof rootFrame === 'undefined') {
      rootFrame = new Frame();
      rootFrame.locals = this.#globals;
    }
    const callStack = [];
    let eoe = false;
    let activeFrame = rootFrame;
    // Tokens are only needed by a few instructions (mostly on error paths),
    // so they are resolved on demand instead of once per instruction
    const getToken = (instr: Instruction): TokenInfo =>
      instr.inputTokenIndex >= 0 ? parse_info.inputTokens[instr.level][instr.inputTokenIndex] : DEFAULT_TOKEN;
    for (let index = 0; !eoe && index < instrLen; ++index) {
      const instr = program.instructions[index];
      switch (instr.type) {
        case INSTRUCTION_TYPE.LOAD_NAME_CALLEABLE:
        case INSTRUCTION_TYPE.LOAD_NAME:
          {
            const var_name = program.names[instr.level][instr.operand] || '';
            if (instr.type === INSTRUCTION_TYPE.LOAD_NAME_CALLEABLE) {
              activeFrame = new Frame('__anon__', activeFrame);
              callStack.push(activeFrame);
            }
            // Check locals
            const owner_frame = activeFrame.resolveLocal(var_name);
            if (typeof owner_frame === 'undefined') {
              const token = getToken(instr);
              throw new UnknownNameError(var_name, token.start, token.end);
            }
            activeFrame.stack.push(owner_frame.locals[var_name]);
          }
          break;
        case INSTRUCTION_TYPE.LOAD_GLOBAL:
          {
            const cmd_name = program.names[instr.level][instr.operand];
            if (cmd_name === null || typeof cmd_name === 'undefined') {
              const token = getToken(instr);
              throw new UnknownNameError(i18n.t('UnknownNameError.invalidName', '<InvalidName>'), token.start, token.end)
            } else if (Object.hasOwn(this.#registeredCmds, cmd_name) || cmd_name in opts.aliases) {
              activeFrame = new Frame(cmd_name, activeFrame);
              callStack.push(activeFrame);
            } else {
              const token = getToken(instr);
              throw new UnknownCommandError(cmd_name, token.start, token.end);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_CONST:
          {
            const value = program.values[instr.level][instr.operand];
            activeFrame.stack.push(value);
          }
          break;
        case INSTRUCTION_TYPE.LOAD_ARG:
          {
            const token = getToken(instr);
            const arg_name = token.value;
            if (!activeFrame) {
              throw new NotExpectedCommandArgumentError(arg_name, token.start, token.end);
            }
            if (typeof arg_name === 'string') {
              activeFrame.args.push(arg_name);
            } else {
              throw new InvalidValueError(arg_name);
            }
          }
          break;
        case INSTRUCTION_TYPE.UNITARY_NEGATIVE:
          {
            const val = activeFrame.stack.pop();
            if (typeof val === 'number') {
              activeFrame.stack.push(val * -1);
            } else {
              throw new InvalidValueError(val);
            }
          }
          break;
        case INSTRUCTION_TYPE.ADD:
          {
            const valB = activeFrame.stack.pop();
            const valA = activeFrame.stack.pop();
            if (typeof valA === 'string' || typeof valB === 'string') {
              // String concatenation: coerce the other operand (i.e. booleans, null...) to a string
              activeFrame.stack.push(`${String(valA)}${String(valB)}`);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
              activeFrame.stack.push(valA + valB);
            } else if (typeof valA !== 'number') {
              throw new InvalidValueError(valA);
            } else {
              throw new InvalidValueError(valB);
            }
          }
          break;
        case INSTRUCTION_TYPE.SUBSTRACT:
        case INSTRUCTION_TYPE.MULTIPLY:
        case INSTRUCTION_TYPE.DIVIDE:
        case INSTRUCTION_TYPE.MODULO:
          {
            const valB = activeFrame.stack.pop();
            const valA = activeFrame.stack.pop();
            if (typeof valB !== 'number') {
              throw new InvalidValueError(valB);
            }
            if (typeof valA !== 'number') {
              throw new InvalidValueError(valA);
            }
            if (instr.type === INSTRUCTION_TYPE.SUBSTRACT) {
              activeFrame.stack.push(valA - valB);
            } else if (instr.type === INSTRUCTION_TYPE.MULTIPLY) {
              activeFrame.stack.push(valA * valB);
            } else if (instr.type === INSTRUCTION_TYPE.DIVIDE) {
              activeFrame.stack.push(valA / valB);
            } else if (instr.type === INSTRUCTION_TYPE.MODULO) {
              activeFrame.stack.push(valA % valB);
            }
          }
          break;
        case INSTRUCTION_TYPE.AND:
        case INSTRUCTION_TYPE.OR:
        case INSTRUCTION_TYPE.EQUAL:
        case INSTRUCTION_TYPE.NOT_EQUAL:
          {
            const valB = activeFrame.stack.pop();
            const valA = activeFrame.stack.pop();
            if (instr.type === INSTRUCTION_TYPE.AND) {
              // $FlowFixMe[sketchy-null-mixed]
              activeFrame.stack.push(valA && valB);
            } else if (instr.type === INSTRUCTION_TYPE.OR) {
              // $FlowFixMe[sketchy-null-mixed]
              activeFrame.stack.push(valA || valB);
            } else if (instr.type === INSTRUCTION_TYPE.EQUAL) {
              activeFrame.stack.push(valA === valB);
            } else if (instr.type === INSTRUCTION_TYPE.NOT_EQUAL) {
              activeFrame.stack.push(valA !== valB);
            }
          }
          break;
        case INSTRUCTION_TYPE.GREATER_THAN_OPEN:
        case INSTRUCTION_TYPE.LESS_THAN_OPEN:
        case INSTRUCTION_TYPE.GREATER_THAN_CLOSED:
        case INSTRUCTION_TYPE.LESS_THAN_CLOSED:
          {
            const valB = activeFrame.stack.pop();
            const valA = activeFrame.stack.pop();

            if (typeof valB !== 'number') {
              throw new InvalidValueError(valB);
            }
            if (typeof valA !== 'number') {
              throw new InvalidValueError(valA);
            }

            if (instr.type === INSTRUCTION_TYPE.GREATER_THAN_OPEN) {
              activeFrame.stack.push(valA > valB);
            } else if (instr.type === INSTRUCTION_TYPE.LESS_THAN_OPEN) {
              activeFrame.stack.push(valA < valB);
            } else if (instr.type === INSTRUCTION_TYPE.GREATER_THAN_CLOSED) {
              activeFrame.stack.push(valA >= valB);
            } else if (instr.type === INSTRUCTION_TYPE.LESS_THAN_CLOSED) {
              activeFrame.stack.push(valA <= valB);
            }
          }
          break;
        case INSTRUCTION_TYPE.NOT:
          {
            const val = activeFrame.stack.pop();
            activeFrame.stack.push(!val);
          }
          break;
        case INSTRUCTION_TYPE.CALL_FUNCTION_SILENT:
        case INSTRUCTION_TYPE.CALL_FUNCTION:
          {
            const frame = callStack.pop();
            if (typeof frame?.cmd !== 'undefined') {
              const frame_cmd = frame.cmd;
              let cmd_def = this.#registeredCmds[frame_cmd];
              if (typeof cmd_def === 'undefined') {
                // FIXME: Done in this way to support 'aliases'
                if (!(frame_cmd in opts.aliases) && frame.stack[0] !== null && typeof frame.stack[0] === 'object') {
                  // When $$var fires at argument position (no args on the frame yet) and the
                  // referenced function expects arguments, treat it as a reference pass so
                  // higher-order patterns like `arr_map [1,2,3] $$sq` work correctly.
                  // Zero-arg functions ($$RMOD, $$mop, etc.) are still called immediately.
                  if (frame.stack.length === 1 && frame.args.length === 0) {
                    // $FlowFixMe[incompatible-use]
                    // $FlowFixMe[prop-missing]
                    const fn_args_len: number = frame.stack[0]?.args?.length ?? 0;
                    if (fn_args_len > 0) {
                      activeFrame = callStack.at(-1) || rootFrame;
                      activeFrame.stack.push(frame.stack[0]);
                      break;
                    }
                  }
                  // $FlowFixMe[incompatible-type]
                  cmd_def = frame.stack.shift();
                }
              }
              // Subframes are executed in silent mode
              const ret = await this.#invokeFunction(
                opts,
                frame,
                frame_cmd,
                // $FlowFixMe[incompatible-type]
                cmd_def,
                parse_info,
                instr.type === INSTRUCTION_TYPE.CALL_FUNCTION_SILENT || opts.silent === true,
              );
              activeFrame = callStack.at(-1) || rootFrame;
              activeFrame.stack.push(ret);
            }
          }
          break;
        case INSTRUCTION_TYPE.RETURN_VALUE:
          {
            const frame = callStack.pop() || rootFrame;
            activeFrame = callStack.at(-1) || rootFrame;
            activeFrame.stack.push(frame.stack.pop());
            eoe = true;
          }
          break;
        case INSTRUCTION_TYPE.STORE_NAME:
          {
            const token = getToken(instr);
            const vname = program.names[instr.level][instr.operand];
            const vvalue = activeFrame.stack.pop();
            if (vname === null || typeof vname === 'undefined') {
              if (!token) {
                throw new InvalidInstructionError();
              }
              throw new InvalidNameError(token.value, token.start, token.end);
            } else if (typeof vvalue === 'undefined') {
              const value_instr = program.instructions[index - 1];
              const value_token = parse_info.inputTokens[value_instr.level][value_instr.inputTokenIndex] || {};
              throw new InvalidTokenError(value_token.value, value_token.start, value_token.end);
            } else {
              if (token.type === LEXER.AssignmentAdd || token.type === LEXER.AssignmentSubstract || token.type === LEXER.AssignmentMultiply || token.type === LEXER.AssignmentDivide || token.type === LEXER.Increment || token.type === LEXER.Decrement) {
                let stored_value = activeFrame.getLocal(vname);
                if (typeof stored_value === 'undefined') {
                  throw new InvalidNameError(vname, token.start, token.end);
                }

                if (token.type === LEXER.AssignmentAdd || token.type === LEXER.Increment) {
                  // $FlowFixMe[unsafe-addition]
                  stored_value = stored_value + vvalue;
                } else if (token.type === LEXER.AssignmentSubstract || token.type === LEXER.Decrement) {
                  // $FlowFixMe[unsafe-arithmetic]
                  stored_value = stored_value - vvalue;
                } else if (token.type === LEXER.AssignmentMultiply) {
                  // $FlowFixMe[unsafe-arithmetic]
                  stored_value = stored_value * vvalue;
                } else if (token.type === LEXER.AssignmentDivide) {
                  // $FlowFixMe[unsafe-arithmetic]
                  stored_value = stored_value / vvalue;
                }
                activeFrame.setLocal(vname, stored_value);
              } else {
                activeFrame.setLocal(vname, vvalue);
              }
            }
          }
          break;
        case INSTRUCTION_TYPE.STORE_SUBSCR:
          {
            const token = getToken(instr);
            const attr_value = activeFrame.stack.pop();
            const attr_name = activeFrame.stack.pop();
            const data = activeFrame.stack.pop();
            try {
              // $FlowFixMe[incompatible-type]
              const data_obj: {[mixed]: mixed} = data;
              if (token.type === LEXER.AssignmentAdd || token.type === LEXER.Increment) {
                // $FlowFixMe[unsafe-addition]
                data_obj[attr_name] = data_obj[attr_name] + attr_value;
              } else if (token.type === LEXER.AssignmentSubstract || token.type === LEXER.Decrement) {
                // $FlowFixMe[unsafe-arithmetic]
                data_obj[attr_name] = data_obj[attr_name] - attr_value;
              } else if (token.type === LEXER.AssignmentMultiply) {
                // $FlowFixMe[unsafe-arithmetic]
                data_obj[attr_name] = data_obj[attr_name] * attr_value;
              } else if (token.type === LEXER.AssignmentDivide) {
                // $FlowFixMe[unsafe-arithmetic]
                data_obj[attr_name] = data_obj[attr_name] / attr_value;
              } else {
                data_obj[attr_name] = attr_value;
              }
              // activeFrame.setLocal(vname, data);
              activeFrame.stack.push(data);
            } catch (err) {
              throw new InvalidInstructionError(err.message);
            }
          }
          break;
        case INSTRUCTION_TYPE.LOAD_DATA_ATTR:
          {
            const attr_name = activeFrame.stack.pop();
            const index_value = activeFrame.stack.length - 1;
            const value = activeFrame.stack[index_value];

            if (value === null || typeof value === 'undefined') {
              throw new InvalidValueError(typeof attr_name === 'string' ? attr_name : 'Unknown');
            }

            let res_value = null;
            try {
              // $FlowFixMe[incompatible-use]
              // $FlowFixMe[prop-missing]
              res_value = value[attr_name];
            } catch (_err) {
              // Do nothing
            }
            if (res_value === null || typeof res_value === 'undefined') {
              if (typeof attr_name === 'string' && !isNumber(attr_name) && value instanceof Array) {
                const plucked = pluck(value, attr_name);
                if (!plucked.every(item => typeof item === 'undefined')) {
                  res_value = plucked;
                }
              }
            }
            activeFrame.stack[index_value] = res_value;
          }
          break;
        case INSTRUCTION_TYPE.BUILD_LIST:
          {
            const iter_count = instr.operand;
            const value = [];
            for (let i = 0; i < iter_count; ++i) {
              value.push(activeFrame.stack.pop());
            }
            activeFrame.stack.push(value.reverse());
          }
          break;
        case INSTRUCTION_TYPE.BUILD_MAP:
          {
            const iter_count = instr.operand;
            const value: {[mixed]: mixed} = {};
            for (let i = 0; i < iter_count; ++i) {
              const val = activeFrame.stack.pop();
              const key = activeFrame.stack.pop();
              value[key] = val;
            }
            activeFrame.stack.push(value);
          }
          break;
        case INSTRUCTION_TYPE.PUSH_FRAME:
          activeFrame = new Frame(undefined, activeFrame);
          callStack.push(activeFrame);
          break;
        case INSTRUCTION_TYPE.POP_FRAME:
          callStack.pop();
          activeFrame = callStack.at(-1) || rootFrame;
          break;
        case INSTRUCTION_TYPE.MAKE_FUNCTION:
          {
            const name = activeFrame.stack.pop();
            const args = activeFrame.stack.pop();
            const code = activeFrame.stack.pop();
            if (args instanceof Array && code !== null && typeof code === 'object') {
              // $FlowFixMe[incompatible-indexer]
              // $FlowFixMe[incompatible-variance]
              // $FlowFixMe[incompatible-type]
              const trash_func = new FunctionTrash(args, code);
              // $FlowFixMe[method-unbinding]
              const exec_bound = trash_func.exec.bind(trash_func);
              const cmd_def: Partial<CMDDef> = {
                // $FlowFixMe[incompatible-type]
                callback: exec_bound,
                type: FUNCTION_TYPE.Native,
                // $FlowFixMe[incompatible-type]
                args: args,
                definition: i18n.t('trash.vmachine.func.definition', 'Internal function'),
                detail: i18n.t('trash.vmachine.func.detail', 'Internal function'),
              };
              if (typeof name === 'string') {
                this.registerCommand(name, cmd_def);
              } else {
                activeFrame.stack.push(cmd_def);
              }
            }
          }
          break;
        case INSTRUCTION_TYPE.JUMP_IF_FALSE:
          {
            activeFrame.lastFlowCheck = activeFrame.stack.at(-1);
            const num_to_skip = instr.operand;
            if (typeof activeFrame.lastFlowCheck === 'undefined' || activeFrame.lastFlowCheck === null || !activeFrame.lastFlowCheck) {
              index += num_to_skip;
            }
          }
          break;
        case INSTRUCTION_TYPE.JUMP_IF_FALSE_POP:
          {
            activeFrame.lastFlowCheck = activeFrame.stack.pop();
            const num_to_skip = instr.operand;
            if (typeof activeFrame.lastFlowCheck === 'undefined' || activeFrame.lastFlowCheck === null || !activeFrame.lastFlowCheck) {
              index += num_to_skip;
            }
          }
          break;
        case INSTRUCTION_TYPE.JUMP_IF_TRUE:
          {
            const num_to_skip = instr.operand;
            if (typeof activeFrame.lastFlowCheck !== 'undefined' && activeFrame.lastFlowCheck !== null && activeFrame.lastFlowCheck) {
              index += num_to_skip;
            }
          }
          break;
        case INSTRUCTION_TYPE.JUMP_BACKWARD:
          {
            const num_to_back = instr.operand;
            index -= num_to_back + 1;
          }
          break;
        case INSTRUCTION_TYPE.JUMP_FORWARD:
          {
            const num_to_adv = instr.operand;
            if (num_to_adv > 0) {
              index += num_to_adv;
            }
          }
          break;
      }
    }
    if (collectAll === true && activeFrame.stack.length > 1) {
      return [...activeFrame.stack];
    }
    return activeFrame.stack.pop();
  }
}
