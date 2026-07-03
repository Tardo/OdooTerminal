// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type {default as VMachine, EvalOptions} from '@trash/vmachine';
import type Frame from '@trash/frame';


async function funcArrReduce(vmachine: VMachine, kwargs: CMDCallbackArgs, frame: Frame, opts: EvalOptions): Promise<mixed> {
  let acc = kwargs.initial;
  for (const item of kwargs.arr) {
    acc = await vmachine.callFunctionValue(kwargs.reducer, [acc, item], frame, opts);
  }
  return acc;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcArrReduce.definition', 'Reduce an array'),
    callback: funcArrReduce,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcArrReduce.detail', 'Reduce an array to a single value using the reducer function'),
    args: [
      [ARG.List | ARG.Any, ['a', 'arr'], true, i18n.t('funcArrReduce.args.arr', 'The array')],
      [ARG.Any, ['i', 'initial'], true, i18n.t('funcArrReduce.args.initial', 'The initial accumulator value')],
      [ARG.Any, ['r', 'reducer'], true, i18n.t('funcArrReduce.args.reducer', 'The reducer function')],
    ],
    example: "-a $arr -i 0 -r (function (acc, item) { return $acc + $item })",
  };
}
