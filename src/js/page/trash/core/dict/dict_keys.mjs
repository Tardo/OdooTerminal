// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcDictKeys(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<Array<string>> {
  return Object.keys(kwargs.dict);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcDictKeys.definition', 'Get the keys of a dictionary'),
    callback: funcDictKeys,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcDictKeys.detail', 'Return an array with all the keys of a dictionary'),
    args: [
      [ARG.Dictionary, ['d', 'dict'], true, i18n.t('funcDictKeys.args.dict', 'The dictionary')],
    ],
    example: '-d {a: 1, b: 2}',
  };
}
