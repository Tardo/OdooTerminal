// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import isEmpty from '@trash/utils/is_empty';
import {getArgumentInfo, getArgumentInfoByName} from '@trash/argument';
import {INSTRUCTION_TYPE, LEXER} from '@trash/constants';
import type {CMDDef, ArgInfo, ParseInfo} from '@trash/interpreter';
import type Shell from '@terminal/shell';
import type Terminal from '@terminal/terminal';

// Optimal String Alignment distance (Damerau-Levenshtein restricted to one adjacent
// transposition, still O(n*m)): catches common single-swap typos ("serach" -> "search",
// distance 1) that plain Levenshtein scores as 2 substitutions instead, without the extra
// alphabet-indexed pass full unrestricted Damerau-Levenshtein needs for this small catalog.
function osaDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: Array<Array<number>> = [];
  for (let i = 0; i <= m; ++i) {
    d.push(new Array<number>(n + 1).fill(0));
    d[i][0] = i;
  }
  for (let j = 0; j <= n; ++j) {
    d[0][j] = j;
  }
  for (let i = 1; i <= m; ++i) {
    for (let j = 1; j <= n; ++j) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

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
    level: number,
  },
  token: {
    cmd: string,
    current: string,
    arg: string,
  },
  total_args: number,
};

export default class CommandAssistant {
  #shell: Shell;
  #parent: Terminal;

  constructor(parent: Terminal) {
    this.#parent = parent;
    this.#shell = parent.getShell();
  }

  #getAvailableCommandNames(name: string, filter_mode: string): Array<string> {
    const cmd_names = Object.keys(this.#shell.getVM().getRegisteredCmds());
    if (!name) {
      return cmd_names.sort();
    }
    const matches =
      filter_mode === 'includes'
        ? cmd_names.filter(cmd_name => cmd_name.includes(name))
        : cmd_names.filter(cmd_name => cmd_name.startsWith(name));
    // Rank prefix matches above mid-word matches, then by match position and length,
    // so the most relevant commands surface first instead of registration order.
    return matches.sort((a, b) => {
      const a_starts = a.startsWith(name);
      const b_starts = b.startsWith(name);
      if (a_starts !== b_starts) {
        return a_starts ? -1 : 1;
      }
      if (!a_starts) {
        const pos_diff = a.indexOf(name) - b.indexOf(name);
        if (pos_diff !== 0) {
          return pos_diff;
        }
      }
      return a.length - b.length || a.localeCompare(b);
    });
  }

  #getAvailableArguments(command_info: CMDDef, arg_name: string): Array<ArgInfo> {
    const arg_infos = [];
    for (const arg of command_info.args) {
      const arg_info = getArgumentInfo(arg);
      if (arg_info !== null && (!arg_name || arg_info.names.long.startsWith(arg_name))) {
        arg_infos.push(arg_info);
      }
    }
    return arg_infos;
  }

  #getAvailableParameters(command_info: CMDDef, arg_key: string | number, arg_value: string): Array<CMDAssistantOption> {
    const res_param_infos: Array<CMDAssistantOption> = [];
    const arg_info = (typeof arg_key === 'number') ? getArgumentInfo(command_info.args[arg_key]) : getArgumentInfoByName(command_info.args, arg_key);
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
        res = values.filter(item => typeof item === 'string' && item.includes(filter_by));
      } else {
        res = values.filter(item => typeof item === 'string' && item.startsWith(filter_by));
      }
    }
    return res;
  }

  async #getAvailableDynamicParameters(
    command_info: CMDDef,
    arg_key: string | number,
    arg_value: string,
    filter_mode: string,
  ): Promise<Array<CMDAssistantOption>> {
    const arg_info = (typeof arg_key === 'number') ? getArgumentInfo(command_info.args[arg_key]) : getArgumentInfoByName(command_info.args, arg_key);
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

  getSelectedParameterIndex(parse_info: ParseInfo, caret_pos: number): [number, number, number, number, number] {
    const {program} = parse_info;
    if (!program.instructions.length) {
      return [-1, -1, -1, 0, 0];
    }
    let sel_token_index = -1;
    let sel_cmd_index = -1;
    let sel_arg_index = -1;
    let sel_level = 0;
    let end_i = -1;
    const total_args: {[number]: number} = {};
    const instr_count = program.instructions.length;
    // Found selected token and EOC/EOL
    for (let index = instr_count - 1; index >= 0 ; --index) {
      const instr = program.instructions[index];
      if (instr.level === -1) {
        continue;
      }
      const token = parse_info.inputTokens[instr.level][instr.inputTokenIndex];
      if (!token) {
        continue;
      }

      if (caret_pos >= token.end && (token.type === LEXER.ArgumentShort || token.type === LEXER.ArgumentLong)) {
        if (!Object.hasOwn(total_args, instr.level)) {
          total_args[instr.level] = 0;
        }
        ++total_args[instr.level];
      }

      if (caret_pos >= token.start && caret_pos <= token.end) {
        sel_token_index = instr.inputTokenIndex;
        sel_level = instr.level;
        end_i = index;
        if (instr.inputTokenIndex > 0) {
          const prev_token = parse_info.inputTokens[instr.level][instr.inputTokenIndex - 1];
          if (prev_token.type === LEXER.ArgumentShort || prev_token.type === LEXER.ArgumentLong) {
            ++end_i;
          }
        }
      }
    }

    // If no token, force last anchor info
    if (end_i === -1) {
      const pend = instr_count - 3;
      if (pend >= 0) {
        const instr = program.instructions[pend];
        if (instr.type === INSTRUCTION_TYPE.LOAD_ARG || instr.type === INSTRUCTION_TYPE.LOAD_GLOBAL) {
          sel_token_index = -1;
          sel_level = 0;
          end_i = pend;
        }
      }
    }

    for (let cindex = end_i; cindex >= 0; --cindex) {
      const instr = program.instructions[cindex];
      if (instr.level !== sel_level) {
        continue;
      }
      const token = parse_info.inputTokens[instr.level][instr.inputTokenIndex];
      if (!token) {
        continue;
      }
      if (sel_arg_index === -1 && instr.type === INSTRUCTION_TYPE.LOAD_ARG) {
        sel_arg_index = instr.inputTokenIndex;
        sel_level = instr.level;
        continue;
      }
      if (instr.type === INSTRUCTION_TYPE.LOAD_GLOBAL) {
        sel_cmd_index = instr.inputTokenIndex;
        sel_level = instr.level;
        break;
      }
    }
    return [sel_cmd_index, sel_token_index, sel_arg_index, sel_level, total_args[sel_level] || 0];
  }

  getInputInfo(data: string, caret_pos: number): CMDAssistantInputInfo {
    const parse_info = this.#shell.parse(data, {ignoreErrors: true});
    const [sel_cmd_index, sel_token_index, sel_arg_index, sel_level, total_args] = this.getSelectedParameterIndex(parse_info, caret_pos);
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
        level: sel_level,
      },
      token: {
        cmd: parse_info.inputTokens[sel_level][sel_cmd_index]?.value,
        current: parse_info.inputTokens[sel_level][sel_token_index_san]?.value,
        arg: parse_info.inputTokens[sel_level][sel_arg_index]?.value,
      },
      total_args: total_args,
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
      const cmd_names = this.#getAvailableCommandNames(input_info.token.cmd || data, filter_mode);
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
      ((
        input_info.index.current - 1 === input_info.index.arg &&
        input_info.token.arg
      ) || (
        !input_info.token.arg && input_info.total_args === 0
      ))
    ) {
      // Parameter
      let param_infos = this.#getAvailableParameters(
        command_info,
        input_info.token.arg || (input_info.index.current - 1),
        input_info.token.current,
      );
      if (!dyn_opts && isEmpty(param_infos)) {
        param_infos = await this.#getAvailableDynamicParameters(
          command_info,
          input_info.token.arg || (input_info.index.current - 1),
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

  // Suggests the closest registered command for a typo or an invented/hallucinated name.
  // Length-normalized OSA distance (ratio = edits / longer-word-length), threshold empirically
  // tuned against this catalog: <= 0.3 catches real typos (substitution/insertion/deletion/
  // adjacent-swap) while rejecting names that merely share a few letters with something
  // registered (e.g. "delete" is NOT close to "unlink" or "clear" under this metric) — replaced
  // the previous keyboard-distance heuristic, whose SCORE_LIMIT was lenient enough to match
  // any short input to *something*, which is unsafe to hand an LLM as a confident suggestion.
  searchSimiliarCommand(in_cmd: string): string | void {
    if (in_cmd.length < 3) {
      return undefined;
    }
    const MAX_RATIO = 0.3;
    const sanitized_in_cmd = in_cmd.toLowerCase();
    const sorted_cmd_keys = Object.keys(this.#shell.getVM().getRegisteredCmds()).sort();
    let best_cmd: string | void;
    let best_dist = Infinity;
    for (const cmd of sorted_cmd_keys) {
      const dist = osaDistance(sanitized_in_cmd, cmd);
      if (dist < best_dist) {
        best_dist = dist;
        best_cmd = cmd;
        if (best_dist === 0) {
          break;
        }
      }
    }
    if (typeof best_cmd === 'undefined') {
      return undefined;
    }
    const ratio = best_dist / Math.max(sanitized_in_cmd.length, best_cmd.length);
    return ratio <= MAX_RATIO ? best_cmd : undefined;
  }
}
