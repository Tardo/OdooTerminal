// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcDictMerge(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<{[string]: mixed}> {
  return {...kwargs.dict, ...kwargs.other};
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcDictMerge.definition', 'Merge two dictionaries'),
    callback: funcDictMerge,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcDictMerge.detail', 'Return a new dictionary with the entries of both dictionaries (the second one takes precedence)'),
    args: [
      [ARG.Dictionary, ['d', 'dict'], true, i18n.t('funcDictMerge.args.dict', 'The dictionary')],
      [ARG.Dictionary, ['o', 'other'], true, i18n.t('funcDictMerge.args.other', 'The dictionary to merge in')],
    ],
    example: '-d {a: 1} -o {b: 2}',
  };
}
