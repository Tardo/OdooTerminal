// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

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
