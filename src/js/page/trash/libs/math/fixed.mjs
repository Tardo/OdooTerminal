// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function funcFixed(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<number> {
  return parseInt(kwargs.num.toFixed(kwargs.decimals), 10);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdFixed.definition', 'Rounds a number DOWN to the nearest integer'),
    callback_internal: funcFixed,
    is_function: true,
    detail: i18n.t('cmdFixed.detail', 'Rounds a number DOWN to the nearest integer'),
    args: [
      [ARG.Number, ['n', 'num'], true, i18n.t('cmdFixed.args.num', 'The number')],
      [ARG.Number, ['d', 'decimals'], false, i18n.t('cmdFixed.args.num', 'The number of decimals')],
    ],
    example: "-n 12.3",
  };
}
