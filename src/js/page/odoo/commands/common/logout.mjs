// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooSession from '@odoo/utils/get_odoo_session';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdLogOut(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const session = getOdooSession();
  if (typeof session === 'undefined') {
    throw new Error(
      i18n.t('cmdLogout.error.notSession', 'Cannot find session information')
    );
  }

  const res = await session.session_logout();
  ctx.screen.updateInputInfo({username: 'Public User'});
  ctx.screen.print(i18n.t('cmdLogout.result.success', 'Logged out'));
  await this.execute('reload', false, true);
  return res;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdLogout.definition', 'Log out'),
    callback: cmdLogOut,
    detail: i18n.t('cmdLogout.detail', 'Session log out'),
  };
}
