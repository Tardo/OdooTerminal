// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcStrSlice(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<string> {
  const s = String(kwargs.str);
  if (typeof kwargs.end !== 'undefined') {
    return s.slice(kwargs.begin, kwargs.end);
  }
  return s.slice(kwargs.begin);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcStrSlice.definition', 'Extract a substring'),
    callback: funcStrSlice,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcStrSlice.detail', 'Return the portion of the string from begin to end (exclusive). Negative indices count from the end.'),
    args: [
      [ARG.String, ['s', 'str'], true, i18n.t('funcStrSlice.args.str', 'The string')],
      [ARG.Number, ['b', 'begin'], true, i18n.t('funcStrSlice.args.begin', 'Start index (inclusive, negative counts from end)')],
      [ARG.Number, ['e', 'end'], false, i18n.t('funcStrSlice.args.end', 'End index (exclusive, negative counts from end)')],
    ],
    example: "-s 'hello world' -b 6",
  };
}
