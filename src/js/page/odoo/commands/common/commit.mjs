// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import writeRecord from '@odoo/orm/write_record';
import Recordset from '@terminal/core/recordset';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';

async function cmdCommit(kwargs, screen) {
  if (!Recordset.isValid(kwargs.recordset)) {
    throw new Error(
      i18n.t('cmdCommit.error.invalidRecordset', 'Invalid recordset'),
    );
  }

  const values_to_write = kwargs.recordset.toWrite();
  if (isEmpty(values_to_write)) {
    screen.printError(i18n.t('cmdCommit.error.noCommit', 'Nothing to commit!'));
    return false;
  }
  const pids = [];
  const tasks = [];
  for (const [rec_id, values] of values_to_write) {
    tasks.push(
      writeRecord(kwargs.recordset.model, rec_id, values, this.getContext()),
    );
    pids.push(rec_id);
  }

  await Promise.all(tasks);
  kwargs.recordset.persist();
  screen.print(
    i18n.t(
      'cmdCommit.error.success',
      "Records '{{pids}}' of {{model}} updated successfully",
      {
        pids,
        model: kwargs.recordset.model,
      },
    ),
  );
  return true;
}

export default {
  definition: i18n.t('cmdCommit.definition', 'Commit recordset changes'),
  callback: cmdCommit,
  detail: i18n.t('cmdCommit.detail', 'Write recordset changes'),
  args: [
    [
      ARG.Any,
      ['r', 'recordset'],
      true,
      i18n.t('cmdCommit.args.recordset', 'The Recordset'),
    ],
  ],
  example: '-r $recordset',
};
