// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import cachedSearchRead from '@odoo/utils/cached_search_read';

async function cmdJSTest(kwargs) {
  let mod = kwargs.module || '';
  if (kwargs.module === '*') {
    mod = '';
  }
  let url = '/web/tests';
  if (kwargs.device === 'mobile') {
    url += '/mobile';
  }
  url += `?module=${mod}`;
  window.location = url;
}

function getOptions(arg_name) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      this.getContext({active_test: true}),
      null,
      item => item.name,
    );
  }
  return Promise.resolve([]);
}

export default {
  definition: i18n.t('cmdJSTest.definition', 'Launch JS Tests'),
  callback: cmdJSTest,
  options: getOptions,
  detail: i18n.t(
    'cmdJSTest.detail',
    'Runs js tests in desktop or mobile mode for the selected module.',
  ),
  args: [
    [
      ARG.String,
      ['m', 'module'],
      false,
      i18n.t('cmdJSTest.args.module', 'The module technical name'),
    ],
    [
      ARG.String,
      ['d', 'device'],
      false,
      i18n.t('cmdJSTest.args.device', 'The device to test'),
      'desktop',
      ['desktop', 'mobile'],
    ],
  ],
  example: '-m web -d mobile',
};
