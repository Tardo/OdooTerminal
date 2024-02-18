// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import rpcQuery from '@odoo/rpc';
import {ARG} from '@trash/constants';

async function cmdRpc(kwargs, screen) {
  const result = await rpcQuery(kwargs.options);
  screen.eprint(result);
  return result;
}

export default {
  definition: i18n.t('cmdRpc.definition', 'Execute raw rpc'),
  callback: cmdRpc,
  detail: i18n.t('cmdRpc.detail', 'Execute raw rpc'),
  args: [
    [
      ARG.Dictionary,
      ['o', 'options'],
      true,
      i18n.t('cmdRpc.args.options', 'The rpc query options'),
    ],
  ],
  example:
    "-o {route: '/jsonrpc', method: 'server_version', params: {service: 'db'}}",
};
