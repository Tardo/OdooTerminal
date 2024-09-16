// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getOdooService from '@odoo/utils/get_odoo_service';
import getUserTZ from '@odoo/utils/get_user_tz';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdNow(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const time = getOdooService('web.time', '@web/core/l10n/dates');
  if (typeof time === 'undefined') {
    throw new Error(
      i18n.t('cmdNow.error.notViewDialogsService', 'Cannot find time service')
    );
  }
  const OdooVerMajor = getOdooVersion('major');
  let res = false;
  if (kwargs.type === 'full') {
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      if (kwargs.tz) {
        res = time.formatDateTime(luxon.DateTime.local().setZone(getUserTZ()));
      } else {
        res = time.serializeDateTime(luxon.DateTime.local());
      }
    } else {
      if (kwargs.tz) {
        // $FlowIgnore
        res = moment().format(time.getLangDatetimeFormat());
      } else {
        res = time.datetime_to_str(new Date());
      }
    }
  } else if (kwargs.type === 'date') {
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      if (kwargs.tz) {
        res = time.formatDate(luxon.DateTime.local().setZone(getUserTZ()));
      } else {
        res = time.serializeDate(luxon.DateTime.local());
      }
    } else {
      if (kwargs.tz) {
        // $FlowIgnore
        res = moment().format(time.getLangDateFormat());
      } else {
        res = time.date_to_str(new Date());
      }
    }
  } else if (kwargs.type === 'time') {
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 17) {
      if (kwargs.tz) {
        res = time.formatDateTime(luxon.DateTime.local().setZone(getUserTZ())).split(' ')[1];
      } else {
        res = time.serializeDateTime(luxon.DateTime.local()).split(' ')[1];
      }
    } else {
      if (kwargs.tz) {
        // $FlowIgnore
        res = moment().format(time.getLangTimeFormat());
      } else {
        res = time.time_to_str(new Date());
      }
    }
  }

  ctx.screen.print(res);
  return res;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdNow.definition', 'Current time'),
    callback: cmdNow,
    detail: i18n.t('cmdNow.detail', 'Prints the current time'),
    args: [
      [ARG.String, ['t', 'type'], false, i18n.t('cmdNow.args.type', 'Date type'), 'full', ['full', 'date', 'time']],
      [ARG.Flag, ['tz', 'tz'], false, i18n.t('cmdNow.args.tz', 'Use timezone'), false],
    ],
    example: '-t time --tz',
  };
}
