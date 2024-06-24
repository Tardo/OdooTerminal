// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isEmpty from '@trash/utils/is_empty';
import {getArgumentInfo, getArgumentInfoByName} from '@trash/argument';
import {INSTRUCTION_TYPE, KEYMAP} from '@trash/constants';
import difference from '@trash/utils/difference';
import type {CMDDef, ArgInfo, ParseInfo} from '@trash/interpreter';
import type Shell from '@terminal/shell';
import type Terminal from '@terminal/terminal';

export type CMDAssistantOption = {
  name?: string,
  string?: string,
  value?: mixed,
  is_required: boolean,
  is_default: boolean,
  is_command: boolean,
  is_argument: boolean,
  is_paramater: boolean,
  type: number,
  description: string,
  values?: $ReadOnlyArray<number | string>,
};

export type CMDAssistantInputInfo = {
  index: {
    cmd: number,
    current: number,
    arg: number,
  },
  token: {
    cmd: string,
    current: string,
    arg: string,
  },
};

export default class CommandAssistant {
  #shell: Shell;
  #parent: Terminal;

  constructor(parent: Terminal) {
    this.#parent = parent;
    this.#shell = parent.getShell();
  }

  #getAvailableCommandNames(name: string): Array<string> {
    const cmd_names = Object.keys(this.#shell.getVM().getRegisteredCmds());
    return cmd_names.filter(cmd_name => cmd_name.startsWith(name));
  }

  #getAvailableArguments(command_info: CMDDef, arg_name: string): Array<ArgInfo> {
    const arg_infos = [];
    for (const arg of command_info.args) {
      const arg_info = getArgumentInfo(arg);
      if (!arg_name || arg_info.names.long.startsWith(arg_name)) {
        arg_infos.push(arg_info);
      }
    }
    return arg_infos;
  }

  #getAvailableParameters(command_info: CMDDef, arg_name: string, arg_value: string): Array<CMDAssistantOption> {
    const arg_info = getArgumentInfoByName(command_info.args, arg_name);
    const res_param_infos: Array<CMDAssistantOption> = [];
    if (arg_info) {
      if (arg_info.strict_values) {
        const def_value = arg_info.default_value;
        for (const strict_value of arg_info.strict_values) {
          if (!arg_value || String(strict_value).startsWith(arg_value)) {
            res_param_infos.push({
              value: strict_value,
              is_required: arg_info.is_required,
              is_default: strict_value === def_value,
              is_command: false,
              is_argument: false,
              is_paramater: false,
              type: arg_info.type,
              description: arg_info.description,
              values: arg_info.strict_values,
            });
          }
        }
      } else if (
        typeof arg_info.default_value !== 'undefined' &&
        String(arg_info.default_value).startsWith(arg_value)
      ) {
        res_param_infos.push({
          value: arg_info.default_value,
          is_default: true,
          is_required: arg_info.is_required,
          is_command: false,
          is_argument: false,
          is_paramater: false,
          type: arg_info.type,
          description: arg_info.description,
          values: arg_info.strict_values,
        });
      }
    }

    return res_param_infos;
  }

  #filterParameterOptions(
    values: $ReadOnlyArray<string>,
    filter_by: string,
    filter_mode: string,
  ): $ReadOnlyArray<string> {
    let res = values || [];
    if (filter_by) {
      if (filter_mode === 'includes') {
        res = values.filter(item => item.includes(filter_by));
      } else {
        res = values.filter(item => item.startsWith(filter_by));
      }
    }
    return res;
  }

  async #getAvailableDynamicParameters(
    command_info: CMDDef,
    arg_name: string,
    arg_value: string,
    filter_mode: string,
  ): Promise<Array<CMDAssistantOption>> {
    const arg_info = getArgumentInfoByName(command_info.args, arg_name);
    if (!arg_info) {
      return [];
    }
    const options: $ReadOnlyArray<string> = (await command_info.options.bind(this.#parent)(arg_info.names.long)) || [];
    const options_filtered = this.#filterParameterOptions(options, arg_value, filter_mode);
    const ret: Array<CMDAssistantOption> = [];
    for (const option of options_filtered) {
      ret.push({
        value: option,
        is_default: false,
        is_required: false,
        is_command: false,
        is_argument: false,
        is_paramater: false,
        type: arg_info.type,
        description: arg_info.description,
        values: options,
      });
    }
    return ret;
  }

  getSelectedParameterIndex(parse_info: ParseInfo, caret_pos: number): [number, number, number] {
    const {stack} = parse_info;
    if (!stack.instructions.length) {
      return [-1, -1, -1];
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
        if (instr.type === INSTRUCTION_TYPE.LOAD_ARG || instr.type === INSTRUCTION_TYPE.LOAD_GLOBAL) {
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

  getInputInfo(data: string, caret_pos: number): CMDAssistantInputInfo {
    const parse_info = this.#shell.parse(data, {ignoreErrors: true});
    const [sel_cmd_index, sel_token_index, sel_arg_index] = this.getSelectedParameterIndex(parse_info, caret_pos);
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

  async getAvailableOptions(
    data: string,
    caret_pos: number,
    filter_mode: string,
    dyn_opts: boolean,
  ): Promise<Array<CMDAssistantOption>> {
    const ret: Array<CMDAssistantOption> = [];
    const input_info = this.getInputInfo(data, caret_pos);
    if (isEmpty(input_info)) {
      return ret;
    }
    if (input_info.index.cmd === input_info.index.current) {
      // Command name
      const cmd_names = this.#getAvailableCommandNames(input_info.token.cmd || data);
      for (const cmd_name of cmd_names) {
        ret.push({
          name: cmd_name,
          is_default: false,
          is_required: false,
          is_argument: false,
          is_paramater: false,
          values: [],
          value: undefined,
          type: -1,
          string: cmd_name,
          is_command: true,
          description: this.#shell.getVM().getRegisteredCmds()[cmd_name].definition,
        });
      }
      return ret;
    }

    const command_info = input_info.token.cmd ? this.#shell.getVM().getRegisteredCmds()[input_info.token.cmd] : undefined;
    if (!command_info) {
      return [];
    }

    if (input_info.index.current === input_info.index.arg) {
      // Argument
      const arg_infos = this.#getAvailableArguments(command_info, input_info.token.arg);
      for (const arg_info of arg_infos) {
        ret.push({
          name: `-${arg_info.names.short}, --${arg_info.names.long}`,
          string: `--${arg_info.names.long}`,
          is_default: false,
          is_argument: true,
          is_paramater: false,
          is_required: arg_info.is_required,
          is_command: false,
          type: arg_info.type,
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
      let param_infos = this.#getAvailableParameters(command_info, input_info.token.arg, input_info.token.current);
      if (!dyn_opts && isEmpty(param_infos)) {
        param_infos = await this.#getAvailableDynamicParameters(
          command_info,
          input_info.token.arg,
          input_info.token.current,
          filter_mode,
        );
      }
      for (const param_info of param_infos) {
        const value_str = new String(param_info.value).toString();
        ret.push({
          name: value_str,
          string: value_str,
          is_paramater: true,
          is_default: param_info.is_default,
          is_required: param_info.is_required,
          is_command: false,
          is_argument: false,
          type: param_info.type,
          description: param_info.description,
          values: param_info.values,
        });
      }
    }

    return ret;
  }

   // Key Distance Comparison (Simple mode)
  // Comparison by distance between keys.
  //
  // This mode of analysis limit it to qwerty layouts
  // but can predict words with a better accuracy.
  // Example Case:
  //   - Two commands: horse, house
  //   - User input: hoese
  //
  //   - Output using simple comparison: horse and house (both have the
  //     same weight)
  //   - Output using KDC: horse
  searchSimiliarCommand(in_cmd: string): string | void {
    if (in_cmd.length < 3) {
      return undefined;
    }

    // Only consider words with score lower than this limit
    const SCORE_LIMIT = 50;
    // Columns per Key and Rows per Key
    const cpk = 10,
      rpk = 3;
    const max_dist = Math.sqrt(cpk + rpk);
    const _get_key_dist = function (from: string, to: string) {
      const _get_key_pos2d = function (key: string) {
        const i = KEYMAP.indexOf(key);
        if (i === -1) {
          return [cpk, rpk];
        }
        return [i / cpk, i % rpk];
      };

      const from_pos = _get_key_pos2d(from);
      const to_pos = _get_key_pos2d(to);
      const x = (to_pos[0] - from_pos[0]) * (to_pos[0] - from_pos[0]);
      const y = (to_pos[1] - from_pos[1]) * (to_pos[1] - from_pos[1]);
      return Math.sqrt(x + y);
    };

    const sanitized_in_cmd = in_cmd.toLowerCase();
    const sorted_cmd_keys = Object.keys(this.#shell.getVM().getRegisteredCmds()).sort();
    const min_score = [0, ''];
    const sorted_keys_len = sorted_cmd_keys.length;
    for (let x = 0; x < sorted_keys_len; ++x) {
      const cmd = sorted_cmd_keys[x];
      // Analize typo's
      const search_index = sanitized_in_cmd.search(cmd);
      let cmd_score = 0;
      if (search_index === -1) {
        // Penalize word length diff
        cmd_score = Math.abs(sanitized_in_cmd.length - cmd.length) / 2 + max_dist;
        // Analize letter key distances
        for (let i = 0; i < sanitized_in_cmd.length; ++i) {
          if (i < cmd.length) {
            const score = _get_key_dist(sanitized_in_cmd.charAt(i), cmd.charAt(i));
            if (score === 0) {
              --cmd_score;
            } else {
              cmd_score += score;
            }
          } else {
            break;
          }
        }
        // Using all letters?
        const cmd_vec = cmd.split('').map(k => k.charCodeAt(0));
        const in_cmd_vec = sanitized_in_cmd.split('').map(k => k.charCodeAt(0));
        if (difference(in_cmd_vec, cmd_vec).length === 0) {
          cmd_score -= max_dist;
        }
      } else {
        cmd_score = Math.abs(sanitized_in_cmd.length - cmd.length) / 2;
      }

      // Search lower score
      // if zero = perfect match (this never should happens)
      if (min_score[1] === '' || cmd_score < min_score[0]) {
        min_score[0] = cmd_score;
        min_score[1] = cmd;
        if (min_score[0] === 0.0) {
          break;
        }
      }
    }

    return min_score[0] < SCORE_LIMIT ? min_score[1] : undefined;
  }
}
