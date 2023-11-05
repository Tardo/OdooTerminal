// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isEmpty from '@terminal/utils/is_empty';
import {getArgumentInfo, getArgumentInfoByName} from '@trash/argument';
import {ARG, INSTRUCTION_TYPE} from '@trash/constants';

const MAX_OPTIONS = 35;

export default class CommandAssistant {
  #virtMachine = null;
  #parent = null;

  constructor(parent) {
    this.#parent = parent;
    this.#virtMachine = parent.virtMachine;
  }

  #getAvailableCommandNames(name) {
    const cmd_names = Object.keys(this.#virtMachine.commands);
    return cmd_names.filter(cmd_name => cmd_name.startsWith(name));
  }

  #getAvailableArguments(command_info, arg_name) {
    const arg_infos = [];
    for (const arg of command_info.args) {
      const arg_info = getArgumentInfo(arg);
      if (!arg_name || arg_info.names.long.startsWith(arg_name)) {
        arg_infos.push(arg_info);
      }
    }
    return arg_infos;
  }

  #getAvailableParameters(command_info, arg_name, arg_value) {
    const arg_info = getArgumentInfoByName(command_info.args, arg_name);
    const res_param_infos = [];
    if (arg_info) {
      if (arg_info.strict_values) {
        const def_value = arg_info.default_value;
        for (const strict_value of arg_info.strict_values) {
          if (!arg_value || String(strict_value).startsWith(arg_value)) {
            res_param_infos.push({
              value: strict_value,
              is_required: arg_info.is_required,
              is_default: strict_value === def_value,
              type: arg_info.type,
              description: arg_info.description,
              values: arg_info.strict_values,
            });
          }
        }
      } else if (
        arg_info.default_value &&
        String(arg_info.default_value).startsWith(arg_value)
      ) {
        res_param_infos.push({
          value: arg_info.default_value,
          is_default: true,
          is_required: arg_info.is_required,
          type: arg_info.type,
          description: arg_info.description,
          values: arg_info.strict_values,
        });
      }
    }

    return res_param_infos;
  }

  async #getAvailableDynamicParameters(command_info, arg_name, arg_value) {
    const arg_info = getArgumentInfoByName(command_info.args, arg_name);
    if (!arg_info) {
      return [];
    }
    let options =
      (await command_info.options.bind(this.#parent)(
        arg_info.names.long,
        arg_info,
        arg_value,
      )) || [];
    options = options.slice(0, MAX_OPTIONS);
    const ret = [];
    for (const option of options) {
      ret.push({
        value: option,
        is_default: false,
        is_required: false,
        type: arg_info.type,
        description: arg_info.description,
        values: options,
      });
    }
    return ret;
  }

  getSelectedParameterIndex(parse_info, caret_pos) {
    const {stack} = parse_info;
    if (!stack.instructions.length) {
      return [-1, -1];
    }
    let sel_token_index = -1;
    let sel_cmd_index = -1;
    let sel_arg_index = -1;
    let end_i = -1;
    const instr_count = stack.instructions.length;
    // Found selected token and EOC/EOL
    for (let index = 0; index < instr_count; ++index) {
      const instr = stack.instructions[index];
      if (instr.level !== 0) {
        continue;
      }
      const token = parse_info.inputTokens[instr.level][instr.inputTokenIndex];
      if (!token) {
        continue;
      }
      if (caret_pos >= token.start && caret_pos <= token.end) {
        sel_token_index = instr.inputTokenIndex;
        end_i = index;
      }
    }

    // If no token, force last anchor info
    if (end_i === -1) {
      const pend = instr_count - 3;
      if (pend >= 0) {
        const instr = stack.instructions[pend];
        if (
          instr.type === INSTRUCTION_TYPE.LOAD_ARG ||
          instr.type === INSTRUCTION_TYPE.LOAD_GLOBAL
        ) {
          sel_token_index = -1;
          end_i = pend;
        }
      }
    }

    for (let cindex = end_i; cindex >= 0; --cindex) {
      const instr = stack.instructions[cindex];
      if (instr.level > 0) {
        continue;
      }
      const token = parse_info.inputTokens[instr.level][instr.inputTokenIndex];
      if (!token) {
        continue;
      }
      if (sel_arg_index === -1 && instr.type === INSTRUCTION_TYPE.LOAD_ARG) {
        sel_arg_index = instr.inputTokenIndex;
        continue;
      }
      if (instr.type === INSTRUCTION_TYPE.LOAD_GLOBAL) {
        sel_cmd_index = instr.inputTokenIndex;
        break;
      }
    }
    return [sel_cmd_index, sel_token_index, sel_arg_index];
  }

  getInputInfo(data, caret_pos) {
    if (!data) {
      return {};
    }
    const parse_info = this.#virtMachine.parse(data);
    const [sel_cmd_index, sel_token_index, sel_arg_index] =
      this.getSelectedParameterIndex(parse_info, caret_pos);
    let sel_token_index_san = sel_token_index;
    // If not current, force last arg
    if (sel_token_index_san === -1) {
      const token_prev_index = parse_info.inputTokens[0].length - 1;
      if (sel_cmd_index !== token_prev_index) {
        sel_token_index_san = sel_arg_index + 1;
      }
    }
    return {
      index: {
        cmd: sel_cmd_index,
        current: sel_token_index_san,
        arg: sel_arg_index,
      },
      token: {
        cmd: parse_info.inputTokens[0][sel_cmd_index]?.value,
        current: parse_info.inputTokens[0][sel_token_index_san]?.value,
        arg: parse_info.inputTokens[0][sel_arg_index]?.value,
      },
    };
  }

  async getAvailableOptions(data, caret_pos) {
    const ret = [];
    const input_info = this.getInputInfo(data, caret_pos);
    if (isEmpty(input_info)) {
      return [];
    }
    if (input_info.index.cmd === input_info.index.current) {
      // Command name
      const cmd_names = this.#getAvailableCommandNames(
        input_info.token.cmd || data,
      );
      for (const cmd_name of cmd_names) {
        ret.push({
          name: cmd_name,
          string: cmd_name,
          is_command: true,
          description: this.#virtMachine.commands[cmd_name].definition,
        });
      }
      return ret;
    }

    const command_info = input_info.token.cmd
      ? this.#virtMachine.commands[input_info.token.cmd]
      : undefined;
    if (!command_info) {
      return [];
    }

    if (input_info.index.current === input_info.index.arg) {
      // Argument
      const arg_infos = this.#getAvailableArguments(
        command_info,
        input_info.token.arg,
      );
      for (const arg_info of arg_infos) {
        ret.push({
          name: `-${arg_info.names.short}, --${arg_info.names.long}`,
          string: `--${arg_info.names.long}`,
          is_argument: true,
          is_required: arg_info.is_required,
          type: ARG.getHumanType(arg_info.type),
          description: arg_info.description,
          values: arg_info.strict_values,
        });
      }
    } else if (
      input_info.index.current !== input_info.index.cmd &&
      input_info.index.current - 1 === input_info.index.arg &&
      input_info.token.arg
    ) {
      // Parameter
      let param_infos = this.#getAvailableParameters(
        command_info,
        input_info.token.arg,
        input_info.token.current,
      );
      if (isEmpty(param_infos)) {
        param_infos = await this.#getAvailableDynamicParameters(
          command_info,
          input_info.token.arg,
          input_info.token.current,
        );
      }
      for (const param_info of param_infos) {
        ret.push({
          name: param_info.value,
          string: param_info.value,
          is_paramater: true,
          is_default: param_info.is_default,
          is_required: param_info.is_required,
          type: ARG.getHumanType(param_info.type),
          description: param_info.description,
          values: param_info.strict_values,
        });
      }
    }

    return ret;
  }
}
