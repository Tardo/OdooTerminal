// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcStrUpper(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<string> {
  return String(kwargs.str).toUpperCase();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcStrUpper.definition', 'Convert string to uppercase'),
    callback: funcStrUpper,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcStrUpper.detail', 'Return the string converted to uppercase'),
    args: [
      [ARG.String, ['s', 'str'], true, i18n.t('funcStrUpper.args.str', 'The string')],
    ],
    example: "-s 'hello'",
  };
}
