// @flow
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import i18n from 'i18next';
import {getStorageItem, setStorageItem} from '@terminal/core/storage/local';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';

async function cmdAlias(kwargs, screen) {
  const aliases = getStorageItem('terminal_aliases') || {};
  if (!kwargs.name) {
    if (isEmpty(aliases)) {
      screen.print(i18n.t('cmdAliasNotDefined', 'No aliases defined.'));
    } else {
      for (const alias_name in aliases) {
        screen.print(
          ` - ${alias_name}  <small class="text-muted"><i>${aliases[alias_name]}</i></small>`,
        );
      }
    }
    return aliases;
  } else if (Object.hasOwn(this.registeredCmds, kwargs.name)) {
    throw new Error(i18n.t('cmdAliasInvalidAliasName', 'Invalid alias name'));
  }
  if (kwargs.cmd && kwargs.cmd.length) {
    aliases[kwargs.name] = kwargs.cmd;
    screen.print(i18n.t('cmdAliasCreated', 'Alias created successfully'));
  } else if (Object.hasOwn(aliases, kwargs.name)) {
    delete aliases[kwargs.name];
    screen.print(i18n.t('cmdAliasRemoved', 'Alias removed successfully'));
  } else {
    throw new Error(
      i18n.t('cmdAliasNotExists', 'The selected alias not exists'),
    );
  }
  setStorageItem('terminal_aliases', aliases, err => screen.print(err));
  return aliases;
}

export default {
  definition: i18n.t('cmdAliasDefinition', 'Create aliases'),
  callback: cmdAlias,
  detail: i18n.t(
    'cmdAliasDetail',
    'Define aliases to run commands easy. ' +
      "<br><b>WARNING:</b> This command uses 'local storage' " +
      'to persist the data even if you close the browser. ' +
      'This data can be easy accessed by other computer usedrs. ' +
      "Don't use sensible data if you are using a shared " +
      'computer.' +
      '<br><br>Can use positional parameters ($1,$2,$3,$N...)',
  ),
  args: [
    [
      ARG.String,
      ['n', 'name'],
      false,
      i18n.t('cmdAliasArgName', 'The name of the alias'),
    ],
    [
      ARG.String,
      ['c', 'cmd'],
      false,
      i18n.t('cmdAliasArgCmd', 'The command to run'),
    ],
  ],
  example: i18n.t('cmdAliasExample', '-n myalias -c "print \'Hello, $1!\'"'),
};
