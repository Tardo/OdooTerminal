// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import showEffect from '@odoo/base/show_effect';
import getOdooService from '@odoo/utils/get_odoo_service';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';

async function cmdShowEffect(kwargs, screen) {
  const OdooVerMajor = getOdooVersion('major');
  if (OdooVerMajor < 15) {
    // Soft-Error
    screen.printError('This command is only available in Odoo 15.0+');
    return;
  }
  if (isEmpty(kwargs.type)) {
    const {registry} = getOdooService('@web/core/registry');
    const effects = registry.category('effects');
    screen.print('Available effects:');
    screen.print(effects.getEntries().map(item => item[0]));
  } else {
    showEffect(kwargs.type, kwargs.options);
  }
}

export default {
  definition: i18n.t('cmdEffect.definition', 'Show effect'),
  callback: cmdShowEffect,
  detail: i18n.t('cmdEffect.detail', 'Show effect'),
  args: [
    [
      ARG.String,
      ['t', 'type'],
      false,
      i18n.t('cmdEffect.args.type', 'The type of the effect'),
    ],
    [
      ARG.Dictionary,
      ['o', 'options'],
      false,
      i18n.t('cmdEffect.args.options', 'The extra options to use'),
    ],
  ],
  example: "-t rainbow_man -o {message: 'Hello world!'}",
};
