// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcArrPrepend(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<$ReadOnlyArray<mixed>> {
  kwargs.arr.unshift(kwargs.item);
  return kwargs.arr;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcArrPrepend.definition', 'Prepend an item to an array'),
    callback: funcArrPrepend,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcArrPrepend.detail', 'Insert an item at the beginning of an array (mutates it in place)'),
    args: [
      [ARG.List | ARG.Any, ['a', 'arr'], true, i18n.t('funcArrPrepend.args.arr', 'The array')],
      [ARG.Any, ['i', 'item'], true, i18n.t('funcArrPrepend.args.item', 'The item to prepend')],
    ],
    example: "-a $arr -i 'value'",
  };
}
