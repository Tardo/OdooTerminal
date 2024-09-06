// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooEnv from '@odoo/utils/get_odoo_env';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdNotify(this: Terminal, kwargs: CMDCallbackArgs) {
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number') {
    if (OdooVerMajor < 17) {
      getOdooEnv().services.notification.notify({
        message: kwargs.message,
        title: kwargs.title,
        subtitle: kwargs.subtitle,
        buttons: kwargs.buttons,
        sticky: kwargs.sticky,
        className: kwargs.className,
        type: kwargs.type,
      });
    } else {
      getOdooEnv().services.notification.add(
        kwargs.message,
        {
          title: kwargs.title,
          subtitle: kwargs.subtitle,
          buttons: kwargs.buttons,
          sticky: kwargs.sticky,
          className: kwargs.className,
          type: kwargs.type,
        });
    }
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdNotify.definition', 'Shows a notification'),
    callback: cmdNotify,
    detail: i18n.t('cmdNotify.detail', 'Displays a notification with a custom message'),
    args: [
      [ARG.String, ['m', 'message'], true, i18n.t('cmdNotify.args.message', 'The message')],
      [ARG.String, ['ty', 'type'], false, i18n.t('cmdNotify.args.type', 'The type'), "warning", ["warning", "danger", "success", "info"]],
      [ARG.String, ['t', 'title'], false, i18n.t('cmdNotify.args.title', 'The title')],
      [ARG.String, ['sub', 'subtitle'], false, i18n.t('cmdNotify.args.subtitle', 'The subtitle')],
      [ARG.Flag, ['sticky', 'sticky'], false, i18n.t('cmdNotify.args.sticky', 'Is sticky')],
      [ARG.List | ARG.String, ['b', 'buttons'], false, i18n.t('cmdNotify.args.buttons', 'The buttons')],
      [ARG.String, ['cn', 'className'], false, i18n.t('cmdNotify.args.className', 'The className')],
    ],
  };
}
