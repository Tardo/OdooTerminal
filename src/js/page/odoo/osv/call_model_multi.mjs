// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';

export default function (
  model,
  ids,
  method,
  args,
  kwargs,
  context,
  extra_options,
) {
  const skwargs = Object.assign(
    {
      context: context,
    },
    kwargs,
  );
  const sargs = [ids, ...(args || [])];
  return rpcQuery(
    Object.assign(
      {
        method: method,
        model: model,
        args: sargs,
        kwargs: skwargs,
      },
      extra_options,
    ),
  );
}
