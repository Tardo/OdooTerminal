// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import getOdooSession from '@odoo/utils/get_odoo_session';
import rpcQuery from '@odoo/rpc';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdLogOut(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const session = getOdooSession();
  if (typeof session === 'undefined') {
    throw new Error(
      i18n.t('cmdLogout.error.notSession', 'Cannot find session information')
    );
  }

  const res =
    typeof session.session_logout === 'function'
      ? await session.session_logout()
      : // Odoo 17+: the session is plain data, call the controller directly
        await rpcQuery({route: '/web/session/destroy'});
  ctx.screen.updateInputInfo({username: 'Public User'});
  ctx.screen.print(i18n.t('cmdLogout.result.success', 'Logged out'));
  await this.execute('reload', false, true);
  return res;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLogout.definition', 'Log out'),
    category: 'system',
    callback: cmdLogOut,
    detail: i18n.t('cmdLogout.detail', 'Session log out'),
  };
}
