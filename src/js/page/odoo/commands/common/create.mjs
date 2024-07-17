// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import createRecord from '@odoo/orm/create_record';
import cachedSearchRead from '@odoo/utils/cached_search_read';
import Recordset from '@terminal/core/recordset';
import renderRecordCreated from '@odoo/templates/record_created';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdCreateModelRecord(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<> {
  if (typeof kwargs.value === 'undefined') {
    await doAction({
      type: 'ir.actions.act_window',
      res_model: kwargs.model,
      views: [[false, 'form']],
      target: 'current',
    });
    this.doHide();
    return;
  }

  const results = await createRecord(kwargs.model, kwargs.value, this.getContext(), kwargs.options);
  ctx.screen.print(renderRecordCreated(kwargs.model, results));

  const records = [];
  kwargs.value.forEach((item, index) => {
    records.push(Object.assign({}, item, {id: results[index]}));
  });
  return Recordset.make(kwargs.model, records);
}

function getOptions(this: Terminal, arg_name: string): Promise<Array<string>> {
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
    definition: i18n.t('cmdCreate.definition', 'Create new record'),
    callback: cmdCreateModelRecord,
    options: getOptions,
    detail: i18n.t('cmdCreate.detail', 'Open new model record in form view or directly.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdCreate.args.model', 'The model technical name')],
      [ARG.List | ARG.Dictionary, ['v', 'value'], false, i18n.t('cmdCreate.args.value', 'The values to write')],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('cmdCreate.args.options', 'The options')],
    ],
    example: "-m res.partner -v {name: 'Poldoore'}",
  };
}
