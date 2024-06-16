// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {getArgumentInfo} from '@trash/argument';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
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
    const lnames = [`-${arg_info.names.short}`, `--${arg_info.names.long}`];
    const arg_symbols = arg_info.is_required ? ['<', '>'] : ['[', ']'];
    arg_info_str += `${arg_symbols[0]}${lnames.join(', ')} [${ARG.getHumanType(arg_info.type)}`;
    if (
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
        let info = JSON.stringify(arg_info.default_value);
        if (info === null || typeof info === 'undefined') {
          info = 'Unknown';
        }
        arg_info_str += info;
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

async function cmdPrintHelp(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<void> {
  if (typeof kwargs.cmd === 'undefined') {
    const sorted_cmd_keys = Object.keys(this.getShell().getVM().getRegisteredCmds()).sort();
    const sorted_keys_len = sorted_cmd_keys.length;
    for (let x = 0; x < sorted_keys_len; ++x) {
      const _cmd = sorted_cmd_keys[x];
      ctx.screen.printHelpSimple(_cmd, this.getShell().getVM().getRegisteredCmds()[_cmd]);
    }
  } else if (Object.hasOwn(this.getShell().getVM().getRegisteredCmds(), kwargs.cmd)) {
    await printHelpDetailed.call(this, ctx.screen, kwargs.cmd, this.getShell().getVM().getRegisteredCmds()[kwargs.cmd]);
  } else {
    throw new Error(i18n.t('cmdHelp.error.commandNotExist', "'{{cmd}}' command doesn't exist", {cmd: kwargs.cmd}));
  }
}

function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
  if (arg_name === 'cmd') {
    return Promise.resolve(Object.keys(this.getShell().getVM().getRegisteredCmds()));
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
    args: [[ARG.String, ['c', 'cmd'], false, i18n.t('cmdHelp.args.cmd', 'The command to consult')]],
    example: '-c search',
  };
}
