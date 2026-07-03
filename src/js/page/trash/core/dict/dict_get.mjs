// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcDictGet(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<mixed> {
  if (Object.hasOwn(kwargs.dict, kwargs.key)) {
    return kwargs.dict[kwargs.key];
  }
  return kwargs.default;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcDictGet.definition', 'Get a value from a dictionary'),
    callback: funcDictGet,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcDictGet.detail', 'Return the value for the given key, or the default value if the key does not exist'),
    args: [
      [ARG.Dictionary, ['d', 'dict'], true, i18n.t('funcDictGet.args.dict', 'The dictionary')],
      [ARG.String | ARG.Number, ['k', 'key'], true, i18n.t('funcDictGet.args.key', 'The key')],
      [ARG.Any, ['de', 'default'], false, i18n.t('funcDictGet.args.default', 'The default value')],
    ],
    example: "-d {a: 1} -k 'b' -de 0",
  };
}
