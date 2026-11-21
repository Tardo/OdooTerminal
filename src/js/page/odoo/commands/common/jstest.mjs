// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG} from '@tardo/trash/constants';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import type {CMDCallbackArgs, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdJSTest(kwargs: CMDCallbackArgs) {
  let mod = kwargs.module || '';
  if (kwargs.module === '*') {
    mod = '';
  }
  let url = '/web/tests';
  const OdooVerMajor = getOdooVersion('major');
  if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 18) {
    // Hoot: the module is the '@module' suite, filtered by its hash id (see web/tests/test_js.py)
    url += `?preset=${kwargs.device}`;
    if (mod) {
      let hash = 0;
      const suite = `@${String(mod)}`;
      for (let i = 0; i < suite.length; ++i) {
        hash = (Math.imul(hash, 31) + suite.charCodeAt(i)) >>> 0;
      }
      url += `&id=${hash.toString(16).padStart(8, '0')}`;
    }
    window.location = url;
    return;
  }
  if (kwargs.device === 'mobile') {
    url += '/mobile';
  }
  url += `?module=${mod}`;
  window.location = url;
}

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'module') {
    return cachedSearchRead(
      'options_ir.module.module_active',
      'ir.module.module',
      [],
      ['name'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'name ASC'},
      item => item.name,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdJSTest.definition', 'Launch JS Tests'),
    category: 'devtools',
    callback: cmdJSTest,
    options: getOptions,
    detail: i18n.t('cmdJSTest.detail', 'Runs js tests in desktop or mobile mode for the selected module.'),
    args: [
      [ARG.String, ['m', 'module'], false, i18n.t('cmdJSTest.args.module', 'The module technical name')],
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
}
