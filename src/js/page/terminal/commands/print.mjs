// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdPrint(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
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
