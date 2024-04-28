// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';
import type {BuildQueryOptions} from '@odoo/rpc';

export default function <T>(
  model: string,
  method: string,
  args: ?$ReadOnlyArray<mixed>,
  kwargs: ?{[string]: mixed},
  context: ?{[string]: mixed},
  extra_options: ?{[string]: mixed},
): Promise<T> {
  const skwargs = Object.assign(
    {
      context: context,
    },
    kwargs,
  );
  const options: Partial<BuildQueryOptions> = {
    method: method,
    model: model,
    args: args || [],
    kwargs: skwargs,
  };
  return rpcQuery<T>(Object.assign(options, extra_options));
}
