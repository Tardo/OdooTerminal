// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpc from '@odoo/rpc';

export default function (service, method, args) {
  return rpc.query({
    route: '/jsonrpc',
    params: {
      service: service,
      method: method,
      args: args,
    },
  });
}
