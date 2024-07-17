// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';
import type {BuildQueryOptions} from '@odoo/rpc';

export default async function <T>(
  model: string,
  method: string,
  args: ?$ReadOnlyArray<mixed>,
  kwargs: ?{[string]: mixed},
  context: ?{[string]: mixed},
  extra_params: ?{[string]: mixed},
  options: ?{[string]: mixed},
): Promise<T> {
  const skwargs = Object.assign(
    {
      context: context,
    },
    kwargs,
  );
  const params: Partial<BuildQueryOptions> = {
    method: method,
    model: model,
    args: args || [],
    kwargs: skwargs,
  };
  return await rpcQuery<T>(Object.assign(params, extra_params), options);
}
