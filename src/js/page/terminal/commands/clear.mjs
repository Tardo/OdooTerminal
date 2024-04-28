// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdClear(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  if (kwargs.section === 'history') {
    this.cleanInputHistory();
  } else {
    ctx.screen.clean();
  }
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdClear.definition', 'Clean terminal section'),
    callback: cmdClear,
    detail: i18n.t('cmdClear.detail', 'Clean the selected section'),
    args: [
      [
        ARG.String,
        ['s', 'section'],
        false,
        i18n.t(
          'cmdClear.args.section',
          'The section to clear<br/>- screen: Clean the screen<br/>- history: Clean the command history',
        ),
        'screen',
        ['screen', 'history'],
      ],
    ],
    example: '-s history',
  };
}
