// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function funcPow(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<number> {
  return Math.pow(kwargs.base, kwargs.exponent);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcPow.definition', 'Calculate the exponent value of x raised to the power of y'),
    callback: funcPow,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcPow.detail', 'Calculate the exponent value of x raised to the power of y'),
    args: [
      [ARG.Number, ['b', 'base'], true, i18n.t('funcPow.args.base', 'Base')],
      [ARG.Number, ['e', 'exponent'], true, i18n.t('funcPow.args.exponent', 'Exponent')],
    ],
    example: "-b 2 -e 5",
  };
}
