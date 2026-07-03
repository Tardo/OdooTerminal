// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type {default as VMachine, EvalOptions} from '@trash/vmachine';
import type Frame from '@trash/frame';


async function funcArrFilter(vmachine: VMachine, kwargs: CMDCallbackArgs, frame: Frame, opts: EvalOptions): Promise<Array<mixed>> {
  const res = [];
  for (const item of kwargs.arr) {
    if (await vmachine.callFunctionValue(kwargs.filter, [item], frame, opts)) {
      res.push(item);
    }
  }
  return res;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcArrFilter.definition', 'Filter an array'),
    callback: funcArrFilter,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcArrFilter.detail', 'Return a new array containing only the elements for which the filter function returns true'),
    args: [
      [ARG.List | ARG.Any, ['a', 'arr'], true, i18n.t('funcArrFilter.args.arr', 'The array')],
      [ARG.Any, ['f', 'filter'], true, i18n.t('funcArrFilter.args.filter', 'The filter function')],
    ],
    example: "-a $arr -f (function (item) { return $item > 0 })",
  };
}
