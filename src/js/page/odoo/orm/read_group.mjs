// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import callModel from '@odoo/osv/call_model';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getFieldsInfo from './get_fields_info';

export default async function (
  model: string,
  domain: $ReadOnlyArray<mixed>,
  fields: $ReadOnlyArray<string>,
  groupby: $ReadOnlyArray<string>,
  context: ?{[string]: mixed},
): Promise<Array<{[string]: mixed}>> {
  const version = getOdooVersion('major');
  if (typeof version === 'number' && version >= 20) {
    const bareFields = fields.filter(field => !field.includes(':') && !groupby.includes(field));
    const definitions: {[string]: {aggregator?: string, ...}} = bareFields.length
      ? await getFieldsInfo(model, bareFields, context)
      : {};
    const measures: Array<[string, string]> = [['__count', '__count']];
    for (const spec of fields) {
      if (groupby.includes(spec) || spec === '__count') continue;
      const alias = spec.match(/^(\w+):(\w+)\((\w+)\)$/);
      if (alias) {
        measures.push([`${alias[3]}:${alias[2]}`, alias[1]]);
      } else {
        const [field, explicitAggregate] = spec.split(':');
        const aggregate = explicitAggregate || definitions[spec]?.aggregator;
        if (typeof aggregate === 'string' && aggregate !== '') measures.push([`${field}:${aggregate}`, field]);
      }
    }
    const results = await callModel<Array<{[string]: mixed}>>(
      model,
      'formatted_read_group',
      [domain, groupby, [...new Set(measures.map(([spec]) => spec))]],
      null,
      context,
    );
    return results.map(item => ({
      ...Object.fromEntries(groupby.map(field => [field, item[field]])),
      ...Object.fromEntries(measures.map(([spec, name]) => [name, item[spec]])),
      __domain: [...domain, ...(Array.isArray(item.__extra_domain) ? item.__extra_domain : [])],
    }));
  }
  return callModel(model, 'read_group', [], null, context, {
    domain,
    fields: [...new Set([...fields, ...groupby.map(field => field.split(':')[0])])],
    groupBy: groupby,
    lazy: false,
  });
}
