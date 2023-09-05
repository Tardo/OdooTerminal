// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from '@odoo/rpc';
import isEmpty from '@terminal/utils/is_empty';

export default function (model, method, args, kwargs, context, extra_options) {
  const skwargs = Object.assign(
    {
      context: context,
    },
    kwargs,
  );
  return rpc.query(
    Object.assign(
      {
        method: method,
        model: model,
        args: isEmpty(args) ? null : args,
        kwargs: skwargs,
      },
      extra_options,
    ),
  );
}
