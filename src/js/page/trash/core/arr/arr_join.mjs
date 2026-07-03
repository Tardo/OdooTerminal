// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcArrJoin(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<string> {
  return kwargs.arr.join(kwargs.sep);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcArrJoin.definition', 'Join an array into a string'),
    callback: funcArrJoin,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcArrJoin.detail', 'Join all items of an array into a string, separated by the given separator'),
    args: [
      [ARG.List | ARG.Any, ['a', 'arr'], true, i18n.t('funcArrJoin.args.arr', 'The array')],
      [ARG.String, ['s', 'sep'], false, i18n.t('funcArrJoin.args.sep', 'The separator'), ''],
    ],
    example: "-a [1, 2, 3] -s ','",
  };
}
