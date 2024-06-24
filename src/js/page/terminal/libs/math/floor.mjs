// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdFloor(this: Terminal, kwargs: CMDCallbackArgs): Promise<number> {
  return Math.floor(kwargs.num);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdFloor.definition', 'Rounds a number DOWN to the nearest integer'),
    callback: cmdFloor,
    is_hidden: true,
    detail: i18n.t('cmdFloor.detail', 'Rounds a number DOWN to the nearest integer'),
    args: [
      [ARG.Number, ['n', 'num'], true, i18n.t('cmdFloor.args.num', 'The number')],
    ],
    example: "-n 12.3",
  };
}
