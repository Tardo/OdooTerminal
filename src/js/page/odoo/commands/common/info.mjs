// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooRoot from '@odoo/utils/get_odoo_root';
import getUrlInfo from '@odoo/utils/get_url_info';
import getUID from '@odoo/utils/get_uid';
import getUserName from '@odoo/utils/get_username';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdInfo(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string | number | void> {
  let res;
  if (kwargs.active_id || kwargs.active_model) {
    const activeProps = getOdooRoot()?.actionService?.currentController?.props;
    const hasProps = typeof activeProps !== 'undefined';
    if (kwargs.active_id) {
      res = Number(hasProps ? activeProps.resId : getUrlInfo('hash', 'id'));
    } else if (kwargs.active_model) {
      res = hasProps ? activeProps.resModel : getUrlInfo('hash', 'model');
    }
  } else if (kwargs.user_id) {
    res = getUID();
  } else if (kwargs.user_login) {
    res = await getUserName();
  }
  ctx.screen.print(res);
  return res;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdInfo.definition', 'Get session information'),
    callback: cmdInfo,
    detail: i18n.t('cmdInfo.detail', 'Obtains various information from the session'),
    args: [
      [ARG.Flag, ['ui', 'user-id'], false, i18n.t('cmdInfo.args.userId', 'The user id')],
      [ARG.Flag, ['ul', 'user-login'], false, i18n.t('cmdInfo.args.userLogin', 'The user login')],
      [ARG.Flag, ['ai', 'active-id'], false, i18n.t('cmdInfo.args.activeId', 'The active record id')],
      [ARG.Flag, ['am', 'active-model'], false, i18n.t('cmdInfo.args.activeModel', 'The active record model')],
    ],
  };
}

// SEND NOTIFICATION: getOdooEnv().services.notification.notify({message: 'sss'})
