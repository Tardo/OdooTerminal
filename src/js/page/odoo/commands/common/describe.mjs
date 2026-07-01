// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import searchCount from '@odoo/orm/search_count';
import searchRead from '@odoo/orm/search_read';
import getFieldsInfo from '@odoo/orm/get_fields_info';
import {getModelOptions} from './__utils__';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

const KEY_FIELD_TYPES = new Set(['selection', 'many2one', 'many2many', 'one2many']);

// $FlowFixMe[unclear-type]
type FieldDef = {[string]: Object};
// $FlowFixMe[unclear-type]
type FieldDefs = {[string]: Object};

type DateRange = {min: string, max: string};

type DescribeResult = {
  count: number,
  date_range: DateRange | null,
  key_fields: FieldDefs,
  selections: {[string]: $ReadOnlyArray<$ReadOnlyArray<string>>},
};

function isKeyField(fieldDef: FieldDef): boolean {
  // $FlowFixMe[prop-missing]
  if (fieldDef.required === true) {
    return true;
  }
  // $FlowFixMe[prop-missing]
  return KEY_FIELD_TYPES.has(fieldDef.type) && fieldDef.store === true;
}

async function cmdDescribe(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<DescribeResult> {
  const context = await this.getContext();

  const [allFields, count] = await Promise.all([
    getFieldsInfo(kwargs.model, false, context, null),
    searchCount(kwargs.model, [], context, null),
  ]);

  let date_range: DateRange | null = null;
  if (Object.hasOwn(allFields, 'create_date')) {
    const [oldest, newest] = await Promise.all([
      searchRead(kwargs.model, [], ['create_date'], context, {limit: 1, orderBy: 'create_date ASC'}),
      searchRead(kwargs.model, [], ['create_date'], context, {limit: 1, orderBy: 'create_date DESC'}),
    ]);
    if (oldest.length && newest.length) {
      date_range = {
        // $FlowFixMe[prop-missing]
        min: String(oldest[0].create_date),
        // $FlowFixMe[prop-missing]
        max: String(newest[0].create_date),
      };
    }
  }

  const key_fields: FieldDefs = {};
  const selections: {[string]: $ReadOnlyArray<$ReadOnlyArray<string>>} = {};
  const field_names = Object.keys(allFields).sort();
  for (const name of field_names) {
    const def = allFields[name];
    if (isKeyField(def)) {
      key_fields[name] = def;
      // $FlowFixMe[prop-missing]
      if (def.type === 'selection' && Array.isArray(def.selection)) {
        // $FlowFixMe[prop-missing]
        selections[name] = def.selection;
      }
    }
  }

  ctx.screen.print(
    i18n.t('cmdDescribe.result.header', "<strong>Model profile: {{model}}</strong>", {model: kwargs.model}),
  );
  ctx.screen.print(
    i18n.t('cmdDescribe.result.count', "Total records: <strong>{{count}}</strong>", {count}),
  );

  if (date_range) {
    ctx.screen.print(
      i18n.t('cmdDescribe.result.dateRange', "Date range: {{min}} → {{max}}", {
        min: date_range.min,
        max: date_range.max,
      }),
    );
  }

  const key_names = Object.keys(key_fields);
  if (key_names.length) {
    const rows: Array<Array<string>> = [];
    for (const name of key_names) {
      const def = key_fields[name];
      // $FlowFixMe[prop-missing]
      const ftype: string = String(def.type ?? '');
      // $FlowFixMe[prop-missing]
      const label: string = String(def.string ?? '');
      let extra = '';
      if (ftype === 'selection' && selections[name]) {
        extra = selections[name].map(pair => `${pair[0]}=${pair[1]}`).join(', ');
      // $FlowFixMe[prop-missing]
      } else if (def.relation) {
        // $FlowFixMe[prop-missing]
        extra = String(def.relation);
      }
      // $FlowFixMe[prop-missing]
      const req: string = def.required ? '✓' : '';
      rows.push([name, ftype, label, req, extra]);
    }
    ctx.screen.printTable(
      [
        i18n.t('cmdDescribe.table.field', 'Field'),
        i18n.t('cmdDescribe.table.type', 'Type'),
        i18n.t('cmdDescribe.table.label', 'Label'),
        i18n.t('cmdDescribe.table.required', 'Req'),
        i18n.t('cmdDescribe.table.extra', 'Relation / Values'),
      ],
      rows,
    );
  }

  return {count, date_range, key_fields, selections};
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDescribe.definition', 'Model profile: count, date range, key fields and selection values'),
    callback: cmdDescribe,
    options: getModelOptions,
    detail: i18n.t(
      'cmdDescribe.detail',
      'Returns a combined profile of the model in one shot: total record count, create_date range (oldest→newest), and a table of key fields (required fields, stored relational fields, selection fields with their possible values). Replaces 3–4 separate commands (caf + count + read_group).',
    ),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdDescribe.args.model', 'The model technical name')],
    ],
    example: '-m res.partner',
  };
}
