// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import writeRecord from '@odoo/orm/write_record';
import Recordset from '@terminal/core/recordset';
import isEmpty from '@trash/utils/is_empty';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCommit(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  if (!Recordset.isValid(kwargs.recordset)) {
    throw new Error(i18n.t('cmdCommit.error.invalidRecordset', 'Invalid recordset'));
  }

  const values_to_write = kwargs.recordset.toWrite();
  if (isEmpty(values_to_write)) {
    ctx.screen.printError(i18n.t('cmdCommit.error.noCommit', 'Nothing to commit!'));
    return false;
  }
  const pids = [];
  const tasks = [];
  for (const [rec_id, values] of values_to_write) {
    tasks.push(writeRecord(kwargs.recordset.model, rec_id, values, await this.getContext()));
    pids.push(rec_id);
  }

  await Promise.all(tasks);
  kwargs.recordset.persist();
  ctx.screen.print(
    i18n.t('cmdCommit.error.success', "Records '{{pids}}' of {{model}} updated successfully", {
      pids,
      model: kwargs.recordset.model,
    }),
  );
  return true;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdCommit.definition', 'Commit recordset changes'),
    callback: cmdCommit,
    detail: i18n.t('cmdCommit.detail', 'Write recordset changes'),
    args: [[ARG.Any, ['r', 'recordset'], true, i18n.t('cmdCommit.args.recordset', 'The Recordset')]],
    example: '-r $recordset',
  };
}
