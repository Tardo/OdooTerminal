// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';

async function cmdCallModelMethod(kwargs, screen) {
  const pkwargs = kwargs.kwarg;
  if (typeof pkwargs.context === 'undefined') {
    pkwargs.context = this.getContext();
  }
  return rpcQuery({
    method: kwargs.call,
    model: kwargs.model,
    args: kwargs.argument,
    kwargs: pkwargs,
  }).then(result => {
    screen.eprint(result, false, 'line-pre');
    return result;
  });
}

function getOptions(arg_name) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      null,
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default {
  definition: 'Call model method',
  callback: cmdCallModelMethod,
  options: getOptions,
  detail:
    "Call model method. Remember: Methods with @api.model decorator doesn't need the id.",
  args: [
    [ARG.String, ['m', 'model'], true, 'The model technical name'],
    [ARG.String, ['c', 'call'], true, 'The method name to call'],
    [ARG.List | ARG.Any, ['a', 'argument'], false, 'The arguments list', []],
    [ARG.Dictionary, ['k', 'kwarg'], false, 'The arguments dictionary', {}],
  ],
  example: '-m res.partner -c address_get -a [8]',
};
