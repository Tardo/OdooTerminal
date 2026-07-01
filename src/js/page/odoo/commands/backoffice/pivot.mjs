// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import {getModelOptions} from '../common/__utils__';
import getFieldsInfo from '@odoo/orm/get_fields_info';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function assertFieldsExist(
  model: string,
  fields: $ReadOnlyArray<mixed>,
  argLabel: string,
  context: ?{[string]: mixed},
) {
  const names: Array<string> = [];
  for (const f of fields) {
    if (typeof f === 'string' && f.length > 0) {
      const base = f.split(':')[0];
      if (base.length > 0) {
        names.push(base);
      }
    }
  }
  if (names.length === 0) {
    return;
  }
  const defs = await getFieldsInfo(model, names, context, null);
  const missing = names.filter(n => !Object.hasOwn(defs, n));
  if (missing.length > 0) {
    throw new Error(
      i18n.t(
        'cmdPivot.error.unknownFields',
        "{{arg}}: field(s) not found on '{{model}}': {{fields}}. Use 'caf -m {{model}}' to list available fields.",
        {arg: argLabel, model, fields: missing.join(', ')},
      ),
    );
  }
}

async function cmdPivot(this: Terminal, kwargs: CMDCallbackArgs): Promise<mixed> {
  for (const m of kwargs.measure) {
    if (typeof m === 'string' && m.includes(':')) {
      throw new Error(
        i18n.t(
          'cmdPivot.error.measurePrefix',
          "Measure fields must be plain field names (e.g. 'amount_total'), not aggregation-prefixed (e.g. 'sum:amount_total')",
        ),
      );
    }
  }
  const context = await this.getContext();
  await assertFieldsExist(kwargs.model, kwargs.row, '-r/--row', context);
  await assertFieldsExist(kwargs.model, kwargs.col, '-c/--col', context);
  await assertFieldsExist(kwargs.model, kwargs.measure, '-e/--measure', context);
  const actionContext = {
    ...context,
    ...(kwargs.row.length && {pivot_row_groupby: kwargs.row}),
    ...(kwargs.col.length && {pivot_column_groupby: kwargs.col}),
    ...(kwargs.measure.length && {pivot_measures: kwargs.measure}),
  };
  return doAction({
    type: 'ir.actions.act_window',
    name: kwargs.name || i18n.t('cmdPivot.result.name', 'Pivot View'),
    res_model: kwargs.model,
    domain: kwargs.domain,
    views: [[false, 'pivot']],
    target: 'current',
    context: actionContext,
  }).then(() => this.doHide());
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdPivot.definition', 'Open pivot view'),
    callback: cmdPivot,
    options: getModelOptions,
    detail: i18n.t('cmdPivot.detail', 'Open a customized pivot view for a model. To retrieve aggregated data without opening a view, use the read_group command instead.'),
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
        i18n.t('cmdPivot.args.measure', 'Fields to use as measures (plain field names, e.g. amount_total — NOT sum:amount_total)'),
        [],
      ],
      [ARG.List | ARG.Any, ['d', 'domain'], false, i18n.t('cmdPivot.args.domain', 'The domain filter'), []],
      [ARG.String, ['n', 'name'], false, i18n.t('cmdPivot.args.name', 'The view title')],
    ],
    example: '-m sale.order -r partner_id -c user_id -e amount_total',
  };
}
