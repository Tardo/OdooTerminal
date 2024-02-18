// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getOdooService from '@odoo/utils/get_odoo_service';
import getUserTZ from '@odoo/utils/get_user_tz';
import {ARG} from '@trash/constants';

async function cmdNow(kwargs, screen) {
  const time = getOdooService('web.time', '@web/core/l10n/dates');
  const OdooVerMajor = getOdooVersion('major');
  let res = false;
  if (kwargs.type === 'full') {
    if (OdooVerMajor >= 17) {
      if (kwargs.tz) {
        res = time.formatDateTime(luxon.DateTime.local().setZone(getUserTZ()));
      } else {
        res = time.serializeDateTime(luxon.DateTime.local());
      }
    } else {
      if (kwargs.tz) {
        res = moment().format(time.getLangDatetimeFormat());
      } else {
        res = time.datetime_to_str(new Date());
      }
    }
  } else if (kwargs.type === 'date') {
    if (OdooVerMajor >= 17) {
      if (kwargs.tz) {
        res = time.formatDate(luxon.DateTime.local().setZone(getUserTZ()));
      } else {
        res = time.serializeDate(luxon.DateTime.local());
      }
    } else {
      if (kwargs.tz) {
        res = moment().format(time.getLangDateFormat());
      } else {
        res = time.date_to_str(new Date());
      }
    }
  } else if (kwargs.type === 'time') {
    if (OdooVerMajor >= 17) {
      if (kwargs.tz) {
        res = time
          .formatDateTime(luxon.DateTime.local().setZone(getUserTZ()))
          .split(' ')[1];
      } else {
        res = time.serializeDateTime(luxon.DateTime.local()).split(' ')[1];
      }
    } else {
      if (kwargs.tz) {
        res = moment().format(time.getLangTimeFormat());
      } else {
        res = time.time_to_str(new Date());
      }
    }
  }

  screen.print(res);
  return res;
}

export default {
  definition: i18n.t('cmdNow.definition', 'Current time'),
  callback: cmdNow,
  detail: i18n.t('cmdNow.detail', 'Prints the current time'),
  args: [
    [
      ARG.String,
      ['t', 'type'],
      false,
      i18n.t('cmdNow.args.type', 'Date type'),
      'full',
      ['full', 'date', 'time'],
    ],
    [
      ARG.Flag,
      ['tz', 'tz'],
      false,
      i18n.t('cmdNow.args.tz', 'Use timezone'),
      false,
    ],
  ],
  example: '-t time --tz',
};
