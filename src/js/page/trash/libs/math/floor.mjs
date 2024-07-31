// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';

async function funcFloor(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<number> {
  return Math.floor(kwargs.num);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcFloor.definition', 'Rounds a number DOWN to the nearest integer'),
    callback: funcFloor,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcFloor.detail', 'Rounds a number DOWN to the nearest integer'),
    args: [
      [ARG.Number, ['n', 'num'], true, i18n.t('funcFloor.args.num', 'The number')],
    ],
    example: "-n 12.3",
  };
}
