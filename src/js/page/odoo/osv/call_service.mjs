// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';

export default function <T>(service: string, method: string, args: ?$ReadOnlyArray<mixed>): Promise<T> {
  return rpcQuery<T>({
    route: '/jsonrpc',
    params: {
      service: service,
      method: method,
      args: args,
    },
  });
}
