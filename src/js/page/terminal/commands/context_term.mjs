// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdTerminalContextOperation(
  this: Terminal,
  kwargs: CMDCallbackArgs,
  ctx: CMDCallbackContext,
): Promise<{[string]: mixed}> {
  if (kwargs.operation === 'set') {
    this.userContext = kwargs.value;
  } else if (kwargs.operation === 'write') {
    this.userContext = {
      ...this.userContext,
      ...kwargs.value,
    };
  } else if (kwargs.operation === 'delete') {
    if (Object.hasOwn(this.userContext, kwargs.value)) {
      delete this.userContext[kwargs.value];
    } else {
      throw new Error(
        i18n.t('cmdContextTerm.error.notPresent', 'The selected key is not present in the terminal context'),
      );
    }
  }
  ctx.screen.print(this.userContext);
  return this.userContext;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdContextTerm.definition', 'Operations over terminal context dictionary'),
    category: 'terminal',
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
      [ARG.Any, ['v', 'value'], false, i18n.t('cmdContextTerm.args.value', 'The value')],
    ],
    example: '-o write -v {the_example: 1}',
  };
}
