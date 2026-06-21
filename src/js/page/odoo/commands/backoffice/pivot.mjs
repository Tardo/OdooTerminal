// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdPivot(this: Terminal, kwargs: CMDCallbackArgs): Promise<mixed> {
  const context = this.getContext({
    pivot_row_groupby: kwargs.row.length ? kwargs.row : undefined,
    pivot_column_groupby: kwargs.col.length ? kwargs.col : undefined,
    pivot_measures: kwargs.measure.length ? kwargs.measure : undefined,
  });
  return doAction({
    type: 'ir.actions.act_window',
    name: kwargs.name || i18n.t('cmdPivot.result.name', 'Pivot View'),
    res_model: kwargs.model,
    domain: kwargs.domain,
    views: [[false, 'pivot']],
    target: 'current',
    context: context,
  }).then(() => this.doHide());
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
    definition: i18n.t('cmdPivot.definition', 'Open pivot view'),
    callback: cmdPivot,
    options: getOptions,
    detail: i18n.t('cmdPivot.detail', 'Open a customized pivot view for a model.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdPivot.args.model', 'The model technical name')],
      [
        ARG.List | ARG.String,
        ['r', 'row'],
        false,
        i18n.t('cmdPivot.args.row', 'Fields to group by in rows'),
        [],
      ],
      [
        ARG.List | ARG.String,
        ['c', 'col'],
        false,
        i18n.t('cmdPivot.args.col', 'Fields to group by in columns'),
        [],
      ],
      [
        ARG.List | ARG.String,
        ['e', 'measure'],
        false,
        i18n.t('cmdPivot.args.measure', 'Fields to use as measures'),
        [],
      ],
      [ARG.List | ARG.Any, ['d', 'domain'], false, i18n.t('cmdPivot.args.domain', 'The domain filter'), []],
      [ARG.String, ['n', 'name'], false, i18n.t('cmdPivot.args.name', 'The view title')],
    ],
    example: '-m sale.order -r partner_id -c user_id -e amount_total',
  };
}
