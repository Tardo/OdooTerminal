// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import searchRead from '@odoo/orm/search_read';
import getFieldsInfo from '@odoo/orm/get_fields_info';
import cachedSearchRead from '@odoo/net_utils/cached_search_read';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

const DATE_TYPES = new Set(['date', 'datetime']);

type DateRangeResult = {
  model: string,
  field: string,
  min: string | null,
  max: string | null,
};

async function cmdDateRange(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<DateRangeResult> {
  const context = await this.getContext();

  const fieldDefs = await getFieldsInfo(kwargs.model, [kwargs.field], context, null);
  const fieldDef = fieldDefs[kwargs.field];

  if (!fieldDef) {
    throw new Error(
      i18n.t('cmdDateRange.error.unknownField', "Field '{{field}}' not found in model '{{model}}'", {
        field: kwargs.field,
        model: kwargs.model,
      }),
    );
  }

  // $FlowFixMe[prop-missing]
  if (!DATE_TYPES.has(String(fieldDef.type ?? ''))) {
    throw new Error(
      i18n.t('cmdDateRange.error.notDateField', "Field '{{field}}' is of type '{{type}}', expected date or datetime", {
        field: kwargs.field,
        // $FlowFixMe[prop-missing]
        type: String(fieldDef.type ?? ''),
      }),
    );
  }

  const domain = kwargs.domain ?? [];
  const orderField = `${kwargs.field} `;
  const [oldest, newest] = await Promise.all([
    searchRead(kwargs.model, domain, [kwargs.field], context, {limit: 1, orderBy: orderField + 'ASC'}),
    searchRead(kwargs.model, domain, [kwargs.field], context, {limit: 1, orderBy: orderField + 'DESC'}),
  ]);

  const min: string | null = oldest.length && oldest[0][kwargs.field] ? String(oldest[0][kwargs.field]) : null;
  const max: string | null = newest.length && newest[0][kwargs.field] ? String(newest[0][kwargs.field]) : null;

  if (min === null || max === null) {
    ctx.screen.print(
      i18n.t('cmdDateRange.result.noData', "No data found for <strong>{{model}}.{{field}}</strong>", {
        model: kwargs.model,
        field: kwargs.field,
      }),
    );
    return {model: kwargs.model, field: kwargs.field, min: null, max: null};
  }

  // $FlowFixMe[prop-missing]
  const label: string = String(fieldDef.string ?? kwargs.field);
  ctx.screen.print(
    i18n.t('cmdDateRange.result.header', "<strong>{{model}}.{{field}}</strong> ({{label}})", {
      model: kwargs.model,
      field: kwargs.field,
      label,
    }),
  );
  ctx.screen.print(i18n.t('cmdDateRange.result.min', "Min: <strong>{{min}}</strong>", {min}));
  ctx.screen.print(i18n.t('cmdDateRange.result.max', "Max: <strong>{{max}}</strong>", {max}));

  return {model: kwargs.model, field: kwargs.field, min, max};
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
    definition: i18n.t('cmdDateRange.definition', 'Show min/max values for a date or datetime field'),
    callback: cmdDateRange,
    options: getOptions,
    detail: i18n.t(
      'cmdDateRange.detail',
      'Returns the minimum and maximum values of a date or datetime field on a model, optionally filtered by a domain. Validates that the field actually exists and is a date/datetime type before querying. Useful to avoid building graphs or reports over an empty or unexpected date range.',
    ),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdDateRange.args.model', 'The model technical name')],
      [ARG.String, ['f', 'field'], true, i18n.t('cmdDateRange.args.field', 'The date or datetime field name')],
      [ARG.List | ARG.Any, ['d', 'domain'], false, i18n.t('cmdDateRange.args.domain', 'Optional domain filter'), []],
    ],
    example: '-m sale.order -f date_order',
  };
}
