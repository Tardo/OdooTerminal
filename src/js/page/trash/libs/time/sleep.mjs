// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import asyncSleep from '@terminal/utils/async_sleep';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function funcSleep(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<> {
  return await asyncSleep(kwargs.time);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdSleep.definition', 'Sleep'),
    callback: funcSleep,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('cmdSleep.detail', 'Sleep (time in ms)'),
    args: [
      [ARG.Number, ['t', 'time'], false, i18n.t('cmdSleep.args.time', 'The time to sleep (in ms)')],
    ],
    example: '-t 200',
  };
}
