// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import Recordset from '@terminal/core/recordset';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

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
    detail: i18n.t('cmdRollback.detail', 'Undo recordset changes'),
    args: [[ARG.Any, ['r', 'recordset'], true, i18n.t('cmdRollback.args.recordset', 'The Recordset')]],
    example: '-r $recordset',
  };
}
