// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcStrStarts(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<boolean> {
  return String(kwargs.str).startsWith(kwargs.prefix);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcStrStarts.definition', 'Check if a string starts with a prefix'),
    callback: funcStrStarts,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcStrStarts.detail', 'Return true if the string starts with the given prefix'),
    args: [
      [ARG.String, ['s', 'str'], true, i18n.t('funcStrStarts.args.str', 'The string')],
      [ARG.String, ['p', 'prefix'], true, i18n.t('funcStrStarts.args.prefix', 'The prefix to check')],
    ],
    example: "-s 'hello world' -p 'hello'",
  };
}
