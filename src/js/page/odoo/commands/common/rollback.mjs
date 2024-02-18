// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import Recordset from '@terminal/core/recordset';
import {ARG} from '@trash/constants';

async function cmdRollback(kwargs, screen) {
  if (!Recordset.isValid(kwargs.recordset)) {
    throw new Error(
      i18n.t('cmdRollback.error.invalidRecordset', 'Invalid recordset'),
    );
  }

  kwargs.recordset.rollback();
  screen.print(
    i18n.t('cmdRollback.result.success', 'Recordset changes undone'),
  );
}

export default {
  definition: i18n.t('cmdRollback.definition', 'Revert recordset changes'),
  callback: cmdRollback,
  detail: i18n.t('cmdRollback.detail', 'Undo recordset changes'),
  args: [
    [
      ARG.Any,
      ['r', 'recordset'],
      true,
      i18n.t('cmdRollback.args.recordset', 'The Recordset'),
    ],
  ],
  example: '-r $recordset',
};
