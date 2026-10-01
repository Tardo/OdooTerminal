// @flow strict
// Copyright Baptiste <swano@ik.me>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import rpcQuery from '@odoo/rpc';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@odoo/terminal';

type SystemParameter = {
  key: string,
  value: string,
};

async function cmdRenewDatabase(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const uuid = crypto.randomUUID();
  const now = new Date();
  const createDate = now.toISOString().slice(0, 19).replace('T', ' ');
  const expirationDate = new Date(now);
  expirationDate.setDate(now.getDate() + kwargs.expires_in);
  expirationDate.setHours(0)
  const formattedExpirationDate = expirationDate.toISOString().slice(0, 19).replace('T', ' ');

  const params = [
    {param: 'database.create_date', value: createDate},
    {param: 'database.expiration_date', value: formattedExpirationDate},
    {param: 'database.expiration_reason', value: false},
  ];

  if (kwargs.renew_dbuuid) {
    params.push({param: 'database.uuid', value: uuid});
  }

  const version = getOdooVersion('major');
  for (const {param, value} of params) {
    await rpcQuery<SystemParameter>({
      method: typeof version === 'number' && version >= 20 ? 'set_str' : 'set_param',
      model: 'ir.config_parameter',
      args: [param, value],
      kwargs: {context: await this.getContext()},
    });
  }
  ctx.screen.print(i18n.t('cmdRenewDatabase.result.success', 'Database renewed successfully'));
  ctx.screen.print(i18n.t('cmdRenewDatabase.result.success_date', 'New expiration date {{formattedExpirationDate}}.', {formattedExpirationDate}));
  if (kwargs.dbuuid) {
    ctx.screen.print(
      i18n.t('cmdRenewDatabase.result.success_with_uuid', 'New uuid {{uuid}}.', {
        uuid
      }),
    );
  }
  return params;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdRenewDatabase.definition', 'Renew the database'),
    category: 'system',
    callback: cmdRenewDatabase,
    unsafe: true,
    detail: i18n.t(
      'cmdRenewDatabase.detail',
      'Re-generate a new uuid and expiration date for your development database.',
    ),
    args: [
      [ARG.Flag, ['r', 'renew-dbuuid'], false, i18n.t('cmdRenewDatabase.args.dbuuid', 'Renew the uuid of the database')],
      [
        ARG.Number,
        ['e', 'expires_in'],
        false,
        i18n.t('cmdRenewDatabase.args.expires_in', 'Set in days the delay before database expiration.'),
        30,
      ],
    ],
    example: '-r -e 180',
  };
}
