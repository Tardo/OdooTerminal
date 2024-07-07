// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import rpcQuery from '@odoo/rpc';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCallModelMethod(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  const pkwargs = kwargs.kwarg;
  if (typeof pkwargs.context === 'undefined') {
    pkwargs.context = this.getContext();
  }
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

function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdCall.definition', 'Call model method'),
    callback: cmdCallModelMethod,
    options: getOptions,
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
