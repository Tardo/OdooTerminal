// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import callModelMulti from '@odoo/osv/call_model_multi';
import callModel from '@odoo/osv/call_model';
import isNumber from '@trash/utils/is_number';
import type Recordset from '@terminal/core/recordset';

const IGNORED_FIELDS = [
  'id',
  'display_name',
  'create_uid',
  'create_date',
  'write_uid',
  'write_date',
  '__last_update',
];

function getFieldIds(field_data: $ReadOnlyArray<$ReadOnlyArray<number> | [number, string]>, field_info: {[string]: string | number}): $ReadOnlyArray<number> {
  const field_ids = [];
  if (field_info.type === 'many2many') {
    if (field_data.length) {
      field_ids.push(...field_data);
    }
  } else if (field_data.length) {
    field_ids.push(field_data[0]);
  }
  // $FlowFixMe
  return field_ids;
}

function hasUnsafeChar(value: string): boolean {
  return /[<>&'"]/.test(value);
}

async function getXMLIds(model: string, ids: $ReadOnlyArray<number>, context: ?{[string]: mixed}): Promise<{[number]: string}> {
  const metadatas = (
    await callModelMulti<$ReadOnlyArray<OdooMetadataInfo>>(
      model,
      ids,
      'get_metadata',
      null,
      null,
      context,
    )
  );
  const xmlIds = Object.fromEntries(metadatas.map((item) => [item.id, item.xmlid]));
  for (const id of ids) {
    if (typeof xmlIds[id] === 'undefined' || xmlIds[id] === false) {
      // $FlowFixMe
      xmlIds[id] = id;
    }
  }
  debugger;
  return xmlIds;
}

function createRecordField(model: string, field_name: string, value: mixed, field_info: {[string]: string | number}, field_xmlids: ?{[string]: $ReadOnlyArray<string>}): string | void {
  if (!(value instanceof Array) && typeof value === 'object') {
    return;
  }
  let value_str = new String(value).toString();
  if (hasUnsafeChar(value_str)) {
    value_str = `<![CDATA[${value_str}]]>`;
  }
  if (field_info.type === 'boolean') {
    return `\t\t<field name="${field_name}" eval="${value_str === 'true' ? 'True' : 'False'}"/>\n`;
  } else if ((field_info.type === 'one2many' || field_info.type === 'many2one' || field_info.type === 'many2many' || field_info.type === 'reference')) {
    if (!(value instanceof Array)) {
      return;
    }
    // $FlowFixMe
    const xmlids: {[number]: string} = field_xmlids[field_name];
    if (!xmlids) {
      return;
    }
    const field_ids = getFieldIds(value, field_info);
    // $FlowFixMe
    const xmlids_ids = Object.keys(xmlids).filter((item) => field_ids.includes(Number(item))).map((item) => xmlids[item]);
    if (xmlids_ids.length === 1 && field_info.type !== 'many2many' && field_info.type !== 'one2many') {
      return `\t\t<field name="${field_name}" ref="${xmlids_ids[0]}"/>\n`;
    } else {
      const refs = xmlids_ids.filter((item) => item).map((item) => isNumber(item) ? `Command.link(${item})` : `Command.link(ref('${item}'))`);
      if (refs.length === 0) {
        return;
      }
      return `\t\t<field name="${field_name}" eval="[${refs.join(', ')}]"/>\n`;
    }
  }
  return `\t\t<field name="${field_name}">${value_str}</field>\n`;
}

export default async function(items: Recordset, context: ?{[string]: mixed}): Promise<string> {
  const model = items.model;
  const main_xml_ids = await getXMLIds(model, items.ids, context);
  const field_infos: {[string]: {[string]: string | number}} = await callModel(
    model,
    'fields_get',
    [false],
    null,
    context,
  );

  const field_infos_entries = Object.entries(field_infos);
  const field_xmlids = field_infos_entries.filter(([_field_name, field_info]) => field_info.relation).map(([field_name, field_info]) => {
    const field_ids: Array<number> = [];
    // $FlowFixMe
    for (const item of items) {
      const field_data = item[field_name];
      if (typeof field_data !== 'undefined') {
        field_ids.push(...getFieldIds(field_data, field_info));
      }
    }
    if (field_ids.length) {
      // $FlowFixMe
      return getXMLIds(field_info.relation, field_ids, context).then((res_xml_ids) => [field_name, res_xml_ids]);
    }
    return Promise.resolve();
  });
  const xmlids_result = (await Promise.all(field_xmlids)).filter((item) => item);
  // $FlowFixMe
  const xmlids_result_obj = Object.fromEntries(xmlids_result);

  let res = '<?xml version="1.0" encoding="utf-8" ?>\n<odoo>\n';
  // $FlowFixMe
  for (const item of items) {
    res += `\t<record id="${main_xml_ids[item.id]}" model="${model}">\n`;
    const fields = Object.entries(item);
    for (const [field, value] of fields) {
      const field_info = field_infos[field];
      if (!field_info.store || (field_info.type !== 'boolean' && value === false) || IGNORED_FIELDS.includes(field)) {
        continue;
      }
      // $FlowFixMe
      const record = createRecordField(model, field, value, field_info, xmlids_result_obj);
      if (typeof record !== 'undefined') {
        res += record;
      }
    }
    res += '\t</record>\n';
  }
  res += '</odoo>\n';
  return res;
}
