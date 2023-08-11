// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {INSTRUCTION_TYPE} from "../trash/constants.mjs";
import {debounce} from "./utils.mjs";

export default class CommandAssistant {
  #virtMachine = null;

  constructor(virtMachine) {
    this.#virtMachine = virtMachine;
    this.lazyGetAvailableOptions = debounce(
      this.#getAvailableOptions.bind(this),
      175
    );
  }

  #getAvailableCommandNames(name) {
    const cmd_names = Object.keys(this.#virtMachine.commands);
    return cmd_names.filter((cmd_name) => cmd_name.startsWith(name));
  }

  #getAvailableArguments(command_info, arg_name) {
    const arg_infos = [];
    for (const arg of command_info.args) {
      const arg_info = this.#virtMachine.getInterpreter().getArgumentInfo(arg);
      if (!arg_name || arg_info.names.long.startsWith(arg_name)) {
        arg_infos.push(arg_info);
      }
    }
    return arg_infos;
  }

  #getAvailableParameters(command_info, arg_name, arg_value) {
    const arg_info = this.#virtMachine
      .getInterpreter()
      .getArgumentInfoByName(command_info.args, arg_name);

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
        });
      }
    }

    return res_param_infos;
  }

  getSelectedParameterIndex(parse_info, caret_pos) {
    const stack = parse_info.stack;
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
      if (instr.level > 0) {
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
      if (
        sel_token_index !== -1 &&
        instr.type === INSTRUCTION_TYPE.LOAD_GLOBAL
      ) {
        sel_cmd_index = instr.inputTokenIndex;
        break;
      }
    }
    return [sel_cmd_index, sel_token_index, sel_arg_index];
  }

  #getAvailableOptions(data, caret_pos, callback) {
    if (!data) {
      callback([]);
      return;
    }
    const parse_info = this.#virtMachine.getInterpreter().parse(data, {
      needResetStores: false,
      registeredCmds: this.#virtMachine.commands,
    });
    const ret = [];
    const [sel_cmd_index, sel_token_index, sel_arg_index] =
      this.getSelectedParameterIndex(parse_info, caret_pos);
    const cmd_token = parse_info.inputTokens[0][sel_cmd_index];
    const cur_token = parse_info.inputTokens[0][sel_token_index];
    const arg_token = parse_info.inputTokens[0][sel_arg_index];
    if (cur_token === cmd_token) {
      // Command name
      const cmd_names = this.#getAvailableCommandNames(
        cmd_token?.value || data
      );
      for (const cmd_name of cmd_names) {
        ret.push({
          name: cmd_name,
          string: cmd_name,
          is_command: true,
        });
      }
      callback(ret);
      return;
    }

    const command_info = cmd_token
      ? this.#virtMachine.commands[cmd_token.value]
      : undefined;
    if (!command_info || cur_token === -1) {
      callback([]);
      return;
    }
    if (sel_token_index === sel_arg_index) {
      // Argument
      const arg_infos = this.#getAvailableArguments(
        command_info,
        arg_token.value
      );
      for (const arg_info of arg_infos) {
        ret.push({
          name: `-${arg_info.names.short}, --${arg_info.names.long}`,
          string: `--${arg_info.names.long}`,
          is_argument: true,
          is_required: arg_info.is_required,
        });
      }
    } else if (sel_token_index !== sel_cmd_index && arg_token) {
      // Parameter
      const param_infos = this.#getAvailableParameters(
        command_info,
        arg_token.value,
        cur_token.value
      );
      for (const param_info of param_infos) {
        ret.push({
          name: param_info.value,
          string: param_info.value,
          is_paramater: true,
          is_default: param_info.is_default,
          is_required: param_info.is_required,
        });
      }
    }

    callback(ret);
  }
}
