// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import getUrlInfo from '@odoo/utils/get_url_info';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdURL(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<string> {
  let res = '';
  if (kwargs.section === 'search' || kwargs.section === 'hash') {
    if (typeof kwargs.key === 'undefined') {
      ctx.screen.printError(i18n.t('cmdURL.error.notKey', 'A key has not been provided'));
      return res;
    }
    res = getUrlInfo(kwargs.section, kwargs.key) || '';
  } else {
    res = window.location[kwargs.section];
  }

  ctx.screen.print(res);
  return res;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdURL.definition', 'Get URL parameters'),
    callback: cmdURL,
    detail: i18n.t('cmdURL.detail', 'Get URL parameters'),
    args: [
      [
        ARG.String,
        ['s', 'section'],
        true,
        i18n.t('cmdDepends.args.section', 'The URL section'),
        'href',
        ['href', 'search', 'hash', 'host', 'hostname', 'protocol', 'port', 'origin'],
      ],
      [ARG.String, ['k', 'key'], false, i18n.t('cmdDepends.args.key', 'The key')],
    ],
    example: '-s hash -k model',
  };
}
