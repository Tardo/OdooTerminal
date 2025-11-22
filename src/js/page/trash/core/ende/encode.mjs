// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcEncode(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<string> {
  if (kwargs.method === 'b64') {
    return btoa(kwargs.value);
  }
  return kwargs.value;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcEncode.definition', 'Encode'),
    callback: funcEncode,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcEncode.detail', 'Encode data'),
    args: [
      [ARG.String, ['v', 'value'], true, i18n.t('funcEncode.args.value', 'The value to encode')],
      [ARG.String, ['m', 'method'], true, i18n.t('funcEncode.args.method', 'The method to encode'), 'b64', ['b64']],
    ],
    example: "-v 'This is an example' -m b64",
  };
}
