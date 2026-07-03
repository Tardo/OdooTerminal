// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcArrClone(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<$ReadOnlyArray<mixed>> {
  return [...kwargs.arr];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcArrClone.definition', 'Clone an array'),
    callback: funcArrClone,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcArrClone.detail', 'Return a shallow copy of an array'),
    args: [
      [ARG.List | ARG.Any, ['a', 'arr'], true, i18n.t('funcArrClone.args.arr', 'The array')],
    ],
    example: '-a [1, 2, 3]',
  };
}
