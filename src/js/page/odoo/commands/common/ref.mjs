// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@trash/constants';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

type ReferenceInfo = {
  active_xmlid: string,
  result: [number, string],
};

async function cmdRef(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const OdooVerMajor = getOdooVersion('major');
  const tasks = [];
  for (const xmlid of kwargs.xmlid) {
    if (typeof OdooVerMajor === 'number' && OdooVerMajor < 15) {
      tasks.push(
        // $FlowFixMe
        callModel<ReferenceInfo>('ir.model.data', 'xmlid_to_res_model_res_id', [xmlid], null, this.getContext()).then(
          ((active_xmlid: string, result: [number, string]) => {
            return [active_xmlid, result[0], result[1]];
          }).bind(this, xmlid),
        ),
      );
    } else {
      const xmlid_parts = xmlid.split('.');
      const module = xmlid_parts[0];
      const xid = xmlid_parts.slice(1).join('.');
      tasks.push(
        callModel<ReferenceInfo>(
          'ir.model.data',
          'check_object_reference',
          [module, xid],
          null,
          await this.getContext(),
          // $FlowFixMe
        ).then(
          ((active_xmlid: string, result: [number, string]) => {
            return [active_xmlid, result[0], result[1]];
          }).bind(this, xmlid),
        ),
      );
    }
  }
  const results = await Promise.all(tasks);
  const rows = [];
  const len = results.length;
  for (let x = 0; x < len; ++x) {
    const row_index = rows.push([]) - 1;
    const item = results[x];
    rows[row_index].push(item[0], item[1], item[2]);
  }
  ctx.screen.printTable(
    [
      i18n.t('cmdRef.table.xmlID', 'XML ID'),
      i18n.t('cmdRef.table.resModel', 'Res. Model'),
      i18n.t('cmdRef.table.resID', 'Res. ID'),
    ],
    rows,
  );
  return results;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdRef.definition', "Show the referenced model and id of the given xmlid's"),
    callback: cmdRef,
    detail: i18n.t('cmdRef.detail', "Show the referenced model and id of the given xmlid's"),
    args: [[ARG.List | ARG.String, ['x', 'xmlid'], true, i18n.t('cmdRef.args.xmlid', 'The XML-ID')]],
    example: '-x base.main_company,base.model_res_partner',
  };
}
