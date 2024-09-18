// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function funcFixed(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<number> {
  return parseInt(kwargs.num.toFixed(kwargs.decimals), 10);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcFixed.definition', 'Rounds a number UP to the nearest integer'),
    callback: funcFixed,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcFixed.detail', 'Rounds a number UP to the nearest integer'),
    args: [
      [ARG.Number, ['n', 'num'], true, i18n.t('funcFixed.args.num', 'The number')],
      [ARG.Number, ['d', 'decimals'], false, i18n.t('funcFixed.args.num', 'The number of decimals')],
    ],
    example: "-n 12.3",
  };
}
