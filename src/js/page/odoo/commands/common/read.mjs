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
  let fieldDefs = {};

  // Due to possible problems with binary fields it is necessary to filter them out
  if (search_all_fields) {
    if (!kwargs.read_binary) {
      // $FlowFixMe
      fieldDefs = await callModel<{[string]: Object}>(
        kwargs.model,
        'fields_get',
        [],
        null,
        await this.getContext(),
        kwargs.options,
      );

      fields = [];
      Object.entries(fieldDefs).forEach(item => {
        if (item[1].type !== 'binary') {
          fields.push(item[0]);
        }
      });
    } else {
      fields = false;
    }
  }

  const result = await searchRead(kwargs.model, [['id', 'in', kwargs.id]], fields, await this.getContext());
  if (search_all_fields) {
    if (!kwargs.read_binary) {
      const def_fields = Object.keys(fieldDefs);
      for (const field of def_fields) {
        if (fieldDefs[field].type === 'binary') {
          for (const record of result) {
            record[field] = null;
          }
        }
      }
    }
  }

  const recordset = Recordset.make(kwargs.model, result, fieldDefs);
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
