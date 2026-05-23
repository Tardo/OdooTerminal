// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';

export default function <T>(
  model: string,
  ids: $ReadOnlyArray<number>,
  method: string,
  args: ?$ReadOnlyArray<mixed>,
  kwargs: ?{[string]: mixed},
  context: ?{[string]: mixed},
  extra_options: ?{[string]: mixed},
): Promise<T> {
  // $FlowFixMe[cannot-spread-indexer]
  const skwargs = {
    context: context,
    ...kwargs,
  };
  const sargs = [ids, ...(args || [])];
  return rpcQuery<T>(
    // $FlowFixMe[cannot-spread-indexer]
    {
      method: method,
      model: model,
      args: sargs,
      // $FlowFixMe[incompatible-type]
      kwargs: skwargs,
      ...extra_options,
    }
  );
}
