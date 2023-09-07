// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import rpcQuery from '@odoo/rpc';
import {ARG} from '@trash/constants';

async function cmdRpc(kwargs, screen) {
  const result = await rpcQuery(kwargs.options);
  screen.eprint(result);
  return result;
}

export default {
  definition: 'Execute raw rpc',
  callback: cmdRpc,
  detail: 'Execute raw rpc',
  args: [[ARG.Dictionary, ['o', 'options'], true, 'The rpc query options']],
  example:
    "-o {route: '/jsonrpc', method: 'server_version', params: {service: 'db'}}",
};
