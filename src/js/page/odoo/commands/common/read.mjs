// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import searchRead from '@odoo/orm/search_read';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import Recordset from '@terminal/core/recordset';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdSearchModelRecordId(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const search_all_fields = kwargs.field[0] === '*';
  let fields = kwargs.field;
  const bin_fields = [];

  // Due to possible problems with binary fields it is necessary to filter them out
  if (search_all_fields && !kwargs.read_binary) {
    // $FlowFixMe
    const fieldDefs = await callModel<{[string]: Object}>(
      kwargs.model,
      'fields_get',
      [fields],
      null,
      await this.getContext(),
      kwargs.options,
    );

    fields = [];
    Object.entries(fieldDefs).forEach(item => {
      if (item[1].type === 'binary') {
        bin_fields.push(item[0]);
      } else {
        fields.push(item[0]);
      }
    });
  }

  const result = await searchRead(kwargs.model, [['id', 'in', kwargs.id]], fields, await this.getContext());

  if (bin_fields.length !== 0) {
    for (const item of result) {
      for (const bin_field of bin_fields) {
        item[bin_field] = {oterm: true, binary: true};
      }
    }
  }

  const recordset = Recordset.make(kwargs.model, result);
  ctx.screen.print(recordset);
  return recordset;
}

async function getOptions(this: Terminal, arg_name: string) {
  if (arg_name === 'model') {
    return cachedSearchRead(
      'options_ir.model_active',
      'ir.model',
      [],
      ['model'],
      await this.getContext({active_test: true}),
      undefined,
      {orderBy: 'model ASC'},
      item => item.model,
    );
  }
  return [];
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdRead.definition', 'Search model record'),
    callback: cmdSearchModelRecordId,
    options: getOptions,
    detail: i18n.t('cmdRead.detail', 'Launch orm search query.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdRead.args.model', 'The model technical name')],
      [ARG.List | ARG.Number, ['i', 'id'], true, i18n.t('cmdRead.args.id', "The record id's")],
      [
        ARG.List | ARG.String,
        ['f', 'field'],
        false,
        i18n.t('cmdRead.args.field', "The fields to request<br/>Can use '*' to show all fields"),
        ['display_name'],
      ],
      [ARG.Flag, ['rb', 'read-binary'], false, i18n.t('cmdRead.args.readBinary', "Don't filter binary fields")],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('cmdRead.args.options', 'The options')],
    ],
    example: '-m res.partner -i 10,4,2 -f name,street',
  };
}
