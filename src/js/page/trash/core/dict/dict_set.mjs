// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcDictSet(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<{[string]: mixed}> {
  kwargs.dict[kwargs.key] = kwargs.value;
  return kwargs.dict;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcDictSet.definition', 'Set a value in a dictionary'),
    callback: funcDictSet,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcDictSet.detail', 'Set the value for the given key (mutates the dictionary in place)'),
    args: [
      [ARG.Dictionary, ['d', 'dict'], true, i18n.t('funcDictSet.args.dict', 'The dictionary')],
      [ARG.String | ARG.Number, ['k', 'key'], true, i18n.t('funcDictSet.args.key', 'The key')],
      [ARG.Any, ['v', 'value'], true, i18n.t('funcDictSet.args.value', 'The value')],
    ],
    example: "-d $dict -k 'a' -v 1",
  };
}
