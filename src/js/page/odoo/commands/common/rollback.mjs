// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
// $FlowFixMe[untyped-import]
import Recordset from '@terminal/core/recordset';
import {ARG} from '@tardo/trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@tardo/trash/interpreter';

async function cmdRollback(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (!Recordset.isValid(kwargs.recordset)) {
    throw new Error(i18n.t('cmdRollback.error.invalidRecordset', 'Invalid recordset'));
  }

  kwargs.recordset.rollback();
  ctx.screen.print(i18n.t('cmdRollback.result.success', 'Recordset changes undone'));
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdRollback.definition', 'Revert recordset changes'),
    callback: cmdRollback,
    unsafe: true,
    detail: i18n.t('cmdRollback.detail', 'Undo recordset changes'),
    args: [[ARG.Any, ['r', 'recordset'], true, i18n.t('cmdRollback.args.recordset', 'The Recordset')]],
    example: '-r $recordset',
  };
}
