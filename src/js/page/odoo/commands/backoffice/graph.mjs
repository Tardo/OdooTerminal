// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import doAction from '@odoo/base/do_action';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdGraph(this: Terminal, kwargs: CMDCallbackArgs): Promise<mixed> {
  const context = {
    ...(await this.getContext()),
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
    definition: i18n.t('cmdGraph.definition', 'Open graph view'),
    callback: cmdGraph,
    options: getOptions,
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
      [ARG.String, ['e', 'measure'], false, i18n.t('cmdGraph.args.measure', 'The measure field')],
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
