// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import searchRead from '@odoo/orm/search_read';
import {getModelOptions} from './__utils__';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

type DiffEntry = {
  field: string,
  type: string,
  label: string,
  val_a: string,
  val_b: string,
};

type DiffResult = {
  model: string,
  id_a: number,
  id_b: number,
  diff: $ReadOnlyArray<DiffEntry>,
  same: $ReadOnlyArray<DiffEntry>,
};

function getCompareKey(value: mixed, ftype: string): string {
  // For many2one the stored fact is the id, not the display name.
  if (ftype === 'many2one' && Array.isArray(value)) {
    return String(value[0] ?? false);
  }
  if (value === false || value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    // many2many / one2many: sort ids so ordering doesn't produce false diffs.
    return JSON.stringify([...value].sort((a, b) => Number(a) - Number(b)));
  }
  return String(value);
}

function formatValue(value: mixed, ftype: string): string {
  if (value === false || value === null || value === undefined) {
    return '';
  }
  if (ftype === 'many2one' && Array.isArray(value)) {
    return `${String(value[1])} (${String(value[0])})`;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

async function cmdDiff(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<DiffResult> {
  // $FlowFixMe[incompatible-use]
  const ids: Array<number> = kwargs.id;
  if (ids.length !== 2) {
    throw new Error(i18n.t('cmdDiff.error.exactlyTwo', 'Exactly two record IDs are required'));
  }
  const id_a: number = ids[0];
  const id_b: number = ids[1];

  const context = await this.getContext();

  // $FlowFixMe[incompatible-use]
  const raw_field: Array<string> = kwargs.field ?? ['*'];
  const search_all_fields: boolean = raw_field[0] === '*';
  let fields: Array<string> = search_all_fields ? [] : raw_field;

  // $FlowFixMe[unclear-type]
  let fieldDefs: {[string]: Object} = {};
  if (search_all_fields) {
    // $FlowFixMe[unclear-type]
    fieldDefs = await callModel<{[string]: Object}>(kwargs.model, 'fields_get', [], null, context, kwargs.options);
    const all: Array<string> = [];
    for (const [name, def] of Object.entries(fieldDefs)) {
      // $FlowFixMe[prop-missing]
      if (def.type !== 'binary') {
        all.push(name);
      }
    }
    fields = all.sort();
  }

  const records = await searchRead(
    kwargs.model,
    [['id', 'in', [id_a, id_b]]],
    fields,
    context,
    {orderBy: 'id ASC'},
  );

  const rec_a = records.find(r => r.id === id_a);
  const rec_b = records.find(r => r.id === id_b);

  if (!rec_a) {
    throw new Error(
      i18n.t('cmdDiff.error.notFound', "Record {{id}} not found in '{{model}}'", {id: id_a, model: kwargs.model}),
    );
  }
  if (!rec_b) {
    throw new Error(
      i18n.t('cmdDiff.error.notFound', "Record {{id}} not found in '{{model}}'", {id: id_b, model: kwargs.model}),
    );
  }

  const diff: Array<DiffEntry> = [];
  const same: Array<DiffEntry> = [];

  for (const fname of fields) {
    if (fname === 'id') {
      continue;
    }
    // $FlowFixMe[unclear-type]
    const def = fieldDefs[fname] ?? {};
    // $FlowFixMe[prop-missing]
    const ftype: string = String(def.type ?? '');
    // $FlowFixMe[prop-missing]
    const label: string = String(def.string ?? fname);
    // $FlowFixMe[prop-missing]
    const val_a: mixed = rec_a[fname];
    // $FlowFixMe[prop-missing]
    const val_b: mixed = rec_b[fname];
    const entry: DiffEntry = {
      field: fname,
      type: ftype,
      label,
      val_a: formatValue(val_a, ftype),
      val_b: formatValue(val_b, ftype),
    };
    if (getCompareKey(val_a, ftype) !== getCompareKey(val_b, ftype)) {
      diff.push(entry);
    } else {
      same.push(entry);
    }
  }

  ctx.screen.print(
    i18n.t('cmdDiff.result.header', '<strong>Diff {{model}}: #{{id_a}} vs #{{id_b}}</strong>', {
      model: kwargs.model,
      id_a,
      id_b,
    }),
  );
  ctx.screen.print(
    i18n.t('cmdDiff.result.summary', 'Differing fields: <strong>{{diff}}</strong> / Total: <strong>{{total}}</strong>', {
      diff: diff.length,
      total: diff.length + same.length,
    }),
  );

  // $FlowFixMe[incompatible-use]
  const show_all: boolean = kwargs.all === true;
  const rows_to_show: $ReadOnlyArray<DiffEntry> = show_all ? [...diff, ...same] : diff;

  if (rows_to_show.length === 0) {
    ctx.screen.print(
      i18n.t('cmdDiff.result.identical', 'Records are <strong>identical</strong> for the requested fields'),
    );
  } else {
    ctx.screen.printTable(
      [
        i18n.t('cmdDiff.table.field', 'Field'),
        i18n.t('cmdDiff.table.type', 'Type'),
        i18n.t('cmdDiff.table.label', 'Label'),
        i18n.t('cmdDiff.table.valA', '#{{id}}', {id: id_a}),
        i18n.t('cmdDiff.table.valB', '#{{id}}', {id: id_b}),
      ],
      rows_to_show.map(e => [e.field, e.type, e.label, e.val_a, e.val_b]),
    );
  }

  return {model: kwargs.model, id_a, id_b, diff, same};
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdDiff.definition', 'Compare two records field by field'),
    callback: cmdDiff,
    options: getModelOptions,
    detail: i18n.t(
      'cmdDiff.detail',
      'Fetches two records of the same model and compares every field value. By default shows only fields that differ. Use --all to include matching fields too. Many2one fields are compared by stored ID (not display name) to avoid false positives from renamed related records. Binary fields are excluded.',
    ),
    args: [
      [ARG.String, ['m', 'model'], true, i18n.t('cmdDiff.args.model', 'The model technical name')],
      [ARG.List | ARG.Number, ['i', 'id'], true, i18n.t('cmdDiff.args.id', 'Two record IDs to compare (e.g. [10, 20])')],
      [
        ARG.List | ARG.String,
        ['f', 'field'],
        false,
        i18n.t('cmdDiff.args.field', "Fields to compare (default: all non-binary). Use '*' for all."),
        ['*'],
      ],
      [ARG.Flag, ['a', 'all'], false, i18n.t('cmdDiff.args.all', 'Show all fields, including those that are identical')],
      [ARG.Dictionary, ['o', 'options'], false, i18n.t('cmdDiff.args.options', 'Extra options')],
    ],
    example: '-m res.partner -i [10, 20]',
  };
}
