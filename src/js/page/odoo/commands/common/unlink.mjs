// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import unlinkRecord from '@odoo/orm/unlink_record';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdUnlinkModelRecord(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return unlinkRecord(kwargs.model, kwargs.id, this.getContext()).then(result => {
    ctx.screen.print(
      i18n.t('cmdUnlink.result.success', '{{model}} record deleted successfully', {
        model: kwargs.model,
      }),
    );
    return result;
  });
}

function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      this.getContext({active_test: true}),
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdUnlink.definition', 'Unlink record'),
    callback: cmdUnlinkModelRecord,
    options: getOptions,
    detail: i18n.t('cmdUnlink.detail', 'Delete a record.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdUnlink.args.model', 'The model technical name')],
      [ARG.List | ARG.Number, ['i', 'id'], true, i18n.t('cmdUnlink.args.id', "The record id's")],
    ],
    example: '-m res.partner -i 10,4,2',
  };
}
