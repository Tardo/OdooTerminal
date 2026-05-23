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
  // $FlowFixMe[cannot-spread-indexer]
  const skwargs = {
    context: context,
    ...kwargs,
  };
  const params: Partial<BuildQueryOptions> = {
    method: method,
    model: model,
    args: args || [],
    // $FlowFixMe[incompatible-type]
    kwargs: skwargs,
  };
  // $FlowFixMe[cannot-spread-indexer]
  return await rpcQuery<T>({...params, ...extra_params}, options);
}
