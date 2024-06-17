// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {getStorageItem, setStorageItem} from '@terminal/core/storage/local';
import isEmpty from '@trash/utils/is_empty';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdAlias(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<{[string]: string}> {
  const aliases = getStorageItem('terminal_aliases', {});
  if (!kwargs.name) {
    if (isEmpty(aliases)) {
      ctx.screen.print(i18n.t('cmdAlias.notDefined', 'No aliases defined.'));
    } else {
      for (const alias_name in aliases) {
        // $FlowFixMe
        ctx.screen.print(` - ${alias_name}  <small class="text-muted"><i>${aliases[alias_name]}</i></small>`);
      }
    }
    return aliases;
  } else if (Object.hasOwn(this.getShell().getVM().getRegisteredCmds(), kwargs.name)) {
    throw new Error(i18n.t('cmdAlias.invalidAliasName', 'Invalid alias name'));
  }
  if (kwargs.cmd && kwargs.cmd.length) {
    aliases[kwargs.name] = kwargs.cmd;
    ctx.screen.print(i18n.t('cmdAlias.created', 'Alias created successfully'));
  } else if (Object.hasOwn(aliases, kwargs.name)) {
    delete aliases[kwargs.name];
    ctx.screen.print(i18n.t('cmdAlias.removed', 'Alias removed successfully'));
  } else {
    throw new Error(i18n.t('cmdAlias.notExists', 'The selected alias not exists'));
  }
  setStorageItem('terminal_aliases', aliases, err => ctx.screen.print(err));
  return aliases;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdAlias.definition', 'Create aliases'),
    callback: cmdAlias,
    detail: i18n.t(
      'cmdAlias.detail',
      'Define aliases to run commands easy. ' +
        "<br><b>WARNING:</b> This command uses 'local storage' " +
        'to persist the data even if you close the browser. ' +
        'This data can be easy accessed by other computer usedrs. ' +
        "Don't use sensible data if you are using a shared " +
        'computer.' +
        '<br><br>Can use positional parameters ($1,$2,$3,$N...)',
    ),
    args: [
      [ARG.String, ['n', 'name'], false, i18n.t('cmdAlias.args.name', 'The name of the alias')],
      [ARG.String, ['c', 'cmd'], false, i18n.t('cmdAlias.args.cmd', 'The command to run')],
    ],
    example: i18n.t('cmdAlias.example', '-n myalias -c "print \'Hello, $1!\'"'),
  };
}
