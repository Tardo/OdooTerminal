// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {ARG} from '@trash/constants';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type VMachine from '@trash/vmachine';


async function funcDecode(vmachine: VMachine, kwargs: CMDCallbackArgs): Promise<string> {
  if (kwargs.method === 'b64') {
    return atob(kwargs.value);
  }
  return kwargs.value;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcDecode.definition', 'Encode'),
    callback: funcDecode,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcDecode.detail', 'Decode data'),
    args: [
      [ARG.String, ['v', 'value'], true, i18n.t('funcDecode.args.value', 'The value to decode')],
      [ARG.String, ['m', 'method'], true, i18n.t('funcDecode.args.method', 'The method to decode'), 'b64', ['b64']],
    ],
    example: "-v VGhpcyBpcyBhbiBleGFtcGxl -m b64",
  };
}
