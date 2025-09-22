// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function funcAbs(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<number> {
  return Math.abs(kwargs.num);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcAbs.definition', 'Absolute value of a number'),
    callback: funcAbs,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcAbs.detail', 'Returns the absolute value of a number.'),
    args: [
      [ARG.Number, ['n', 'num'], true, i18n.t('funcAbs.args.num', 'The number')],
    ],
    example: "-n 12.3",
  };
}
