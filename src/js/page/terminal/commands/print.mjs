// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdPrint(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string> {
  ctx.screen.print(kwargs.msg);
  return kwargs.msg;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdPrint.definition', 'Print a message'),
    callback: cmdPrint,
    detail: i18n.t('cmdPrint.detail', 'Eval parameters and print the result.'),
    args: [[ARG.Any, ['m', 'msg'], true, i18n.t('cmdPrint.args.msg', 'The message to print')]],
    aliases: ['echo'],
    example: "-m 'This is a example'",
  };
}
