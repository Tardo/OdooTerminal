// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';

async function cmdTerminalContextOperation(kwargs, screen) {
  if (kwargs.operation === 'set') {
    this.userContext = kwargs.value;
  } else if (kwargs.operation === 'write') {
    Object.assign(this.userContext, kwargs.value);
  } else if (kwargs.operation === 'delete') {
    if (Object.hasOwn(this.userContext, kwargs.value)) {
      delete this.userContext[kwargs.value];
    } else {
      throw new Error(
        i18n.t(
          'cmdContextTerm.error.notPresent',
          'The selected key is not present in the terminal context',
        ),
      );
    }
  }
  screen.print(this.userContext);
  return this.userContext;
}

export default {
  definition: i18n.t(
    'cmdContextTerm.definition',
    'Operations over terminal context dictionary',
  ),
  callback: cmdTerminalContextOperation,
  detail: i18n.t(
    'cmdContextTerm.detail',
    'Operations over terminal context dictionary. This context only affects to the terminal operations.',
  ),
  args: [
    [
      ARG.String,
      ['o', 'operation'],
      false,
      i18n.t('cmdContextTerm.args.operation', 'The operation to do'),
      'read',
      ['read', 'write', 'set', 'delete'],
    ],
    [
      ARG.Any,
      ['v', 'value'],
      false,
      i18n.t('cmdContextTerm.args.value', 'The value'),
    ],
  ],
  example: '-o write -v {the_example: 1}',
};
