// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import writeRecord from '@odoo/orm/write_record';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdWriteModelRecord(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  return writeRecord(kwargs.model, kwargs.id, kwargs.value, this.getContext(), kwargs.options).then(result => {
    ctx.screen.print(
      i18n.t('cmdWrite.result.success', '{{model}} record updated successfully', {
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
      undefined,
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return Promise.resolve([]);
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdWrite.definition', 'Update record values'),
    callback: cmdWriteModelRecord,
    options: getOptions,
    detail: i18n.t('cmdWrite.detail', 'Update record values.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdWrite.args.model', 'The model technical name')],
      [ARG.List | ARG.Number, ['i', 'id'], true, i18n.t('cmdWrite.args.id', "The record id's")],
      [ARG.Dictionary, ['v', 'value'], true, i18n.t('cmdWrite.args.value', 'The values to write')],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('cmdWrite.args.options', 'The options')],
    ],
    example: "-m res.partner -i 10,4,2 -v {street: 'Diagon Alley'}",
  };
}
