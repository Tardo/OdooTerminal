// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import asyncSleep from '@terminal/utils/async_sleep';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@terminal/terminal';

async function cmdSleep(this: Terminal, kwargs: CMDCallbackArgs): Promise<> {
  await asyncSleep(kwargs.time);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdSleep.definition', 'Sleep'),
    callback: cmdSleep,
    detail: i18n.t(
      'cmdSleep.detail',
      'Sleep (time in ms)'
    ),
    args: [
      [ARG.Number, ['t', 'time'], false, i18n.t('cmdSleep.args.time', 'The time to sleep (in ms)')],
    ],
    example: '200',
  };
}
