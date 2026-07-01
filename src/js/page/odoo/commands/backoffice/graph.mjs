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
        'cmdGraph.error.unknownFields',
        "{{arg}}: field(s) not found on '{{model}}': {{fields}}. Use 'caf -m {{model}}' to list available fields.",
        {arg: argLabel, model, fields: missing.join(', ')},
      ),
    );
  }
}

async function cmdGraph(this: Terminal, kwargs: CMDCallbackArgs): Promise<mixed> {
  if (typeof kwargs.measure === 'string' && kwargs.measure.includes(':')) {
    throw new Error(
      i18n.t(
        'cmdGraph.error.measurePrefix',
        "Measure field must be a plain field name (e.g. 'amount_total'), not aggregation-prefixed (e.g. 'sum:amount_total')",
      ),
    );
  }
  const context = await this.getContext();
  await assertFieldsExist(kwargs.model, kwargs.groupby, '-g/--groupby', context);
  if (typeof kwargs.measure === 'string' && kwargs.measure.length > 0) {
    await assertFieldsExist(kwargs.model, [kwargs.measure], '-e/--measure', context);
  }
  const actionContext = {
    ...context,
    ...(kwargs.groupby.length && {graph_groupbys: kwargs.groupby}),
    ...(kwargs.measure && {graph_measure: kwargs.measure}),
    ...(kwargs.type && {graph_mode: kwargs.type}),
  };
  return doAction({
    type: 'ir.actions.act_window',
    name: kwargs.name || i18n.t('cmdGraph.result.name', 'Graph View'),
    res_model: kwargs.model,
    domain: kwargs.domain,
    views: [[false, 'graph']],
    target: 'current',
    context: actionContext,
  }).then(() => this.doHide());
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdGraph.definition', 'Open graph view'),
    callback: cmdGraph,
    options: getModelOptions,
    detail: i18n.t('cmdGraph.detail', 'Open a customized graph view for a model. To retrieve grouped data without opening a view, use the read_group command instead.'),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdGraph.args.model', 'The model technical name')],
      [
        ARG.List | ARG.String,
        ['g', 'groupby'],
        false,
        i18n.t('cmdGraph.args.groupby', 'Fields to group by'),
        [],
      ],
      [ARG.String, ['e', 'measure'], false, i18n.t('cmdGraph.args.measure', 'The measure field (plain field name, e.g. amount_total — NOT sum:amount_total)')],
      [
        ARG.String,
        ['t', 'type'],
        false,
        i18n.t('cmdGraph.args.type', 'The chart type'),
        undefined,
        ['bar', 'line', 'pie'],
      ],
      [ARG.List | ARG.Any, ['d', 'domain'], false, i18n.t('cmdGraph.args.domain', 'The domain filter'), []],
      [ARG.String, ['n', 'name'], false, i18n.t('cmdGraph.args.name', 'The view title')],
    ],
    example: '-m sale.order -g partner_id -e amount_total -t bar',
  };
}
