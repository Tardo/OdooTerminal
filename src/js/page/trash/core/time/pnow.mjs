// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {FUNCTION_TYPE} from '@trash/function';
import type {CMDDef} from '@trash/interpreter';

async function funcPNow(): Promise<number> {
  return performance.now();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('funcPNow.definition', 'High resolution timestamp in milliseconds'),
    callback: funcPNow,
    type: FUNCTION_TYPE.Internal,
    detail: i18n.t('funcPNow.detail', 'High resolution timestamp in milliseconds.'),
  };
}
