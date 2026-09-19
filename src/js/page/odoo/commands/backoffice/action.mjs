// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@tardo/trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdCallAction(this: Terminal, kwargs: CMDCallbackArgs): Promise<mixed> {
  return await doAction(kwargs.action, kwargs.options);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdAction.definition', 'Call action'),
    category: 'ui',
    callback: cmdCallAction,
    detail: i18n.t('cmdAction.detail', 'Launch any Odoo action by numeric ID, XML-ID string, or action dict. Does not return data.'),
    args: [
      [
        ARG.Any,
        ['a', 'action'],
        true,
        i18n.t('cmdAction.args.action', 'The action to launch<br/>Can be an string, number or object'),
      ],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('cmdAction.args.options', 'The extra options to use')],
    ],
    example: '-a 134',
  };
}
