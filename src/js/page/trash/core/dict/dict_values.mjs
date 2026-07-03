// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcDictValues(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<Array<mixed>> {
  return Object.values(kwargs.dict);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcDictValues.definition', 'Get the values of a dictionary'),
    callback: funcDictValues,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcDictValues.detail', 'Return an array with all the values of a dictionary'),
    args: [
      [ARG.Dictionary, ['d', 'dict'], true, i18n.t('funcDictValues.args.dict', 'The dictionary')],
    ],
    example: '-d {a: 1, b: 2}',
  };
}
