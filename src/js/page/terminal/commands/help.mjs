// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {getArgumentInfo} from '@tardo/trash/argument';
import {ARG} from '@tardo/trash/constants';
import {FUNCTION_TYPE} from '@tardo/trash/function';
import {buildCommandPrompt} from '@ai/prompts/trash';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';
import type Screen from '@terminal/core/screen';

async function printHelpDetailed(screen: Screen, cmd: string, cmd_def: CMDDef) {
  screen.eprint(i18n.t('cmdHelp.result.name', 'NAME'));
  screen.print(`<div class="terminal-info-section">${cmd} - ${cmd_def.definition}</div>`);
  screen.print(' ');
  screen.eprint(i18n.t('cmdHelp.result.description', 'DESCRIPTION'));
  screen.print(`<div class="terminal-info-section">${cmd_def.detail}</div>`);
  // Create arguments text
  screen.print(' ');
  screen.eprint(i18n.t('cmdHelp.result.arguments', 'ARGUMENTS'));
  let arg_info_str = '';
  for (const arg of cmd_def.args) {
    const arg_info = getArgumentInfo(arg);
    if (arg_info === null) {
      continue;
    }
    const lnames = [`-${arg_info.names.short}`, `--${arg_info.names.long}`];
    const arg_symbols = arg_info.is_required ? ['<', '>'] : ['[', ']'];
    arg_info_str += `${arg_symbols[0]}${lnames.join(', ')} [${ARG.getHumanType(arg_info.type)}`;
    if (
      // $FlowFixMe[invalid-compare]
      arg_info.strict_values === null ||
      typeof arg_info.strict_values === 'undefined' ||
      arg_info.strict_values.length === 0
    ) {
      arg_info_str += `]${arg_symbols[1]}`;
    } else {
      arg_info_str += `(${arg_info.strict_values.join('|')})]${arg_symbols[1]}`;
    }
    if (typeof arg_info.default_value !== 'undefined') {
      if ((arg_info.type & ARG.List) === ARG.List || (arg_info.type & ARG.Dictionary) === ARG.Dictionary) {
        arg_info_str += JSON.stringify(arg_info.default_value) ?? 'Unknown';
      } else {
        arg_info_str += new String(arg_info.default_value).toString();
      }
    }
    arg_info_str += `<div class="terminal-info-description">${arg_info.description}</div>`;
    arg_info_str += '<br/>';
  }
  screen.print(`<div class="terminal-info-section">${arg_info_str}</div>`);
  if (cmd_def.example) {
    screen.eprint(i18n.t('cmdHelp.result.example', 'EXAMPLE'));
    screen.print(`<div class="terminal-info-section">${cmd} ${cmd_def.example}</div>`);
  }
}

async function cmdPrintHelp(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  if (typeof kwargs.cmd === 'undefined') {
    const cmds = this.getShell().getVM().getRegisteredCmds();
    const sorted_cmd_keys = Object.keys(cmds).sort();
    const sorted_keys_len = sorted_cmd_keys.length;
    const matched: Array<string> = [];
    for (let x = 0; x < sorted_keys_len; ++x) {
      const _cmd = sorted_cmd_keys[x];
      const cmd_def = cmds[_cmd];
      const is_command = cmd_def.type === FUNCTION_TYPE.Command;
      // A category is a self-contained filter: some categories (stdlib, graphics) are
      // entirely Internal-type, so gating them behind --all/--only-internal too would
      // make "help --category stdlib" return nothing by default.
      if (typeof kwargs.category !== 'undefined') {
        if (cmd_def.category === kwargs.category) {
          ctx.screen.printHelpSimple(_cmd, cmd_def, !is_command);
          matched.push(_cmd);
        }
        continue;
      }
      if (kwargs.all || (!kwargs.only_internal && is_command) || (kwargs.only_internal && !is_command)) {
        ctx.screen.printHelpSimple(_cmd, cmd_def, !is_command);
      }
    }
    // Category lookups double as an AI discovery path (via run_command): return the
    // compact syntax notation — the same one used in the agent's system prompt — so
    // the result is directly usable, not just the pretty screen output.
    if (typeof kwargs.category !== 'undefined') {
      if (matched.length === 0) {
        const known = [...new Set(Object.values(cmds).map(def => def.category))].sort();
        throw new Error(
          i18n.t('cmdHelp.error.categoryEmpty', "No commands found in category '{{category}}'. Available: {{list}}", {
            category: kwargs.category,
            list: known.join(', '),
          }),
        );
      }
      return matched.map(_cmd => buildCommandPrompt(_cmd, cmds[_cmd])).join('\n');
    }
  } else if (Object.hasOwn(this.getShell().getVM().getRegisteredCmds(), kwargs.cmd)) {
    const cmd_def = this.getShell().getVM().getRegisteredCmds()[kwargs.cmd];
    await printHelpDetailed.call(this, ctx.screen, kwargs.cmd, cmd_def);
    // Same reasoning as the category branch above: give run_command a value to read,
    // not just the screen-formatted output.
    return buildCommandPrompt(kwargs.cmd, cmd_def);
  } else {
    throw new Error(i18n.t('cmdHelp.error.commandNotExist', "'{{cmd}}' command doesn't exist", {cmd: kwargs.cmd}));
  }
}

function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
  if (arg_name === 'cmd') {
    return Promise.resolve(Object.keys(this.getShell().getVM().getRegisteredCmds()));
  } else if (arg_name === 'category') {
    const cmds = this.getShell().getVM().getRegisteredCmds();
    return Promise.resolve([...new Set(Object.values(cmds).map(def => def.category))].sort());
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdHelp.definition', 'Print this help or command detailed info'),
    callback: cmdPrintHelp,
    options: getOptions,
    detail: i18n.t(
      'cmdHelp.detail',
      'Show commands and a quick definition.<br/>- <> ~> Required Parameter<br/>- [] ~> Optional Parameter',
    ),
    args: [
      [ARG.String, ['c', 'cmd'], false, i18n.t('cmdHelp.args.cmd', 'The command to consult')],
      [ARG.String, ['cat', 'category'], false, i18n.t('cmdHelp.args.category', 'Filter commands by category')],
      [ARG.Flag, ['a', 'all'], false, i18n.t('cmdHelp.args.all', 'Show all commands')],
      [ARG.Flag, ['oi', 'only-internal'], false, i18n.t('cmdHelp.args.onlyInternal', 'Show only internal commands')],
    ],
    example: '--category system',
  };
}
