// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import rpcQuery from '@odoo/rpc';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';

async function cmdRpc(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const result = await rpcQuery<mixed>(kwargs.options);
  ctx.screen.eprint(result);
  return result;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdRpc.definition', 'Execute raw rpc'),
    category: 'system',
    callback: cmdRpc,
    unsafe: true,
    detail: i18n.t('cmdRpc.detail', 'Execute raw rpc'),
    args: [[ARG.Dictionary, ['o', 'options'], true, i18n.t('cmdRpc.args.options', 'The rpc query options')]],
    example: '-o {route: "/jsonrpc", method: "server_version", params: {service: "db"}}',
  };
}
