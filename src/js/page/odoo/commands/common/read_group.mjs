// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import readGroup from '@odoo/orm/read_group';
import {getModelOptions} from './__utils__';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

const READ_EXCLUDED_KEYS = ["__domain", "__count"];

async function cmdReadGroup(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<mixed> {
  const results = await readGroup(kwargs.model, kwargs.domain, kwargs.field, kwargs.groupby, await this.getContext());
  if (results) {
    const heads = Object.keys(results[0]).filter((key) => !READ_EXCLUDED_KEYS.includes(key));
    heads.unshift("Count");
    const rows = [];
    for (const item of results) {
      delete item.__domain;
      const count = item.__count;
      delete item.__count;
      const row = Object.values(item);
      row.unshift(count);
      rows.push(row);
    }
    ctx.screen.printTable(heads, rows);
  }
  return results;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdReadGroup.definition', 'Fetch grouped and aggregated data from a model'),
    callback: cmdReadGroup,
    options: getModelOptions,
    detail: i18n.t(
      'cmdReadGroup.detail',
      'Run an ORM read_group on a model and return the aggregated results. Each result row contains the groupby field values, the aggregated measure values, and __count. Use this instead of search when you need sums, counts, or averages per group.',
    ),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdReadGroup.args.model', 'The model technical name')],
      [
        ARG.List | ARG.String,
        ['g', 'groupby'],
        false,
        i18n.t('cmdReadGroup.args.groupby', 'Fields to group by'),
        [],
      ],
      [
        ARG.List | ARG.String,
        ['f', 'field'],
        false,
        i18n.t('cmdReadGroup.args.field', 'Fields to aggregate (measures). Omit to get only counts.'),
        [],
      ],
      [ARG.List | ARG.Any, ['d', 'domain'], false, i18n.t('cmdReadGroup.args.domain', 'The domain filter'), []],
    ],
    example: '-m sale.order -g partner_id -f amount_total',
  };
}
