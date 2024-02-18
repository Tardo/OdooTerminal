// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import {ARG} from '@trash/constants';

async function cmdCallAction(kwargs) {
  return await doAction(kwargs.action, kwargs.options);
}

export default {
  definition: i18n.t('cmdAction.definition', 'Call action'),
  callback: cmdCallAction,
  detail: i18n.t('cmdAction.definition', 'Call action'),
  args: [
    [
      ARG.Any,
      ['a', 'action'],
      true,
      i18n.t(
        'cmdAction.args.action',
        'The action to launch<br/>Can be an string, number or object',
      ),
    ],
    [
      ARG.Dictionary,
      ['o', 'options'],
      false,
      i18n.t('cmdAction.args.options', 'The extra options to use'),
    ],
  ],
  example: '-a 134',
};
