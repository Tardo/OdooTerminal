// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import rpcQuery from '@odoo/rpc';
import {getModelOptions} from './__utils__';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCallModelMethod(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  const pkwargs = kwargs.kwarg;
  pkwargs.context ??= this.getContext();

  return rpcQuery<mixed>({
    method: kwargs.call,
    model: kwargs.model,
    args: kwargs.argument,
    kwargs: pkwargs,
  }).then(result => {
    ctx.screen.eprint(result, false, 'line-pre');
    return result;
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdCall.definition', 'Call model method'),
    callback: cmdCallModelMethod,
    options: getModelOptions,
    unsafe: true,
    detail: i18n.t(
      'cmdCall.detail',
      "Call model method. Remember: Methods with @api.model decorator doesn't need the id.",
    ),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdCall.args.model', 'The model technical name')],
      [ARG.String, ['c', 'call'], true, i18n.t('cmdCall.args.call', 'The method name to call')],
      [ARG.List | ARG.Any, ['a', 'argument'], false, i18n.t('cmdCall.args.argument', 'The arguments list'), []],
      [ARG.Dictionary, ['k', 'kwarg'], false, i18n.t('cmdCall.args.kwarg', 'The arguments dictionary'), {}],
    ],
    example: '-m res.partner -c address_get -a [8]',
  };
}
