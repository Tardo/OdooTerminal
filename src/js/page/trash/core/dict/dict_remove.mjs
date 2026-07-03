// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcDictRemove(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<{[string]: mixed}> {
  delete kwargs.dict[kwargs.key];
  return kwargs.dict;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcDictRemove.definition', 'Remove a key from a dictionary'),
    callback: funcDictRemove,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcDictRemove.detail', 'Remove the given key from a dictionary (mutates the dictionary in place)'),
    args: [
      [ARG.Dictionary, ['d', 'dict'], true, i18n.t('funcDictRemove.args.dict', 'The dictionary')],
      [ARG.String | ARG.Number, ['k', 'key'], true, i18n.t('funcDictRemove.args.key', 'The key')],
    ],
    example: "-d $dict -k 'a'",
  };
}
