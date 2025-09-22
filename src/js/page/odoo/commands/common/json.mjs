// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import rpcQuery from '@odoo/rpc';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdPostJSONData(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return rpcQuery<mixed>({
    route: kwargs.endpoint,
    params: kwargs.data,
  }).then(result => {
    ctx.screen.eprint(result, false, 'line-pre');
    return result;
  });
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdJson.definition', 'Send POST JSON'),
    callback: cmdPostJSONData,
    detail: i18n.t('cmdJson.detail', "Sends HTTP POST 'application/json' request"),
    args: [
      [ARG.String, ['e', 'endpoint'], true, i18n.t('cmdJson.args.endpoint', 'The endpoint')],
      [ARG.Any, ['d', 'data'], false, i18n.t('cmdJson.args.data', 'The data to send')],
    ],
    example: "-e /web/action/load' -d {'action_id': 'base.paper_format_action'}",
  };
}
