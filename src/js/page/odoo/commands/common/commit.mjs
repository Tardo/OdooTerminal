// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import writeRecord from '@odoo/orm/write_record';
import Recordset from '@terminal/core/recordset';
import isEmpty from '@terminal/utils/is_empty';
import {ARG} from '@trash/constants';

async function cmdCommit(kwargs) {
  if (!Recordset.isValid(kwargs.recordset)) {
    throw new Error('Invalid recordset');
  }

  const values_to_write = kwargs.recordset.toWrite();
  if (isEmpty(values_to_write)) {
    this.screen.printError('Nothing to commit!');
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
  this.screen.print(
    `Records '${pids}' of ${kwargs.recordset.model} updated successfully`,
  );
  return true;
}

export default {
  definition: 'Commit recordset changes',
  callback: cmdCommit,
  detail: 'Write recordset changes',
  args: [[ARG.Any, ['r', 'recordset'], true, 'The Recordset']],
  example: '-r $recordset',
};
