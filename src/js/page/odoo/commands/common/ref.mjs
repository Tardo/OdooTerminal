// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import callModel from '@odoo/osv/call_model';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import {ARG} from '@trash/constants';

async function cmdRef(kwargs, screen) {
  const OdooVerMajor = getOdooVersion('major');
  const tasks = [];
  for (const xmlid of kwargs.xmlid) {
    if (OdooVerMajor < 15) {
      tasks.push(
        callModel(
          'ir.model.data',
          'xmlid_to_res_model_res_id',
          [xmlid],
          null,
          this.getContext(),
        ).then(
          ((active_xmlid, result) => {
            return [active_xmlid, result[0], result[1]];
          }).bind(this, xmlid),
        ),
      );
    } else {
      const xmlid_parts = xmlid.split('.');
      const module = xmlid_parts[0];
      const xid = xmlid_parts.slice(1).join('.');
      tasks.push(
        callModel(
          'ir.model.data',
          'check_object_reference',
          [module, xid],
          null,
          this.getContext(),
        ).then(
          ((active_xmlid, result) => {
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
  screen.printTable(
    [
      i18n.t('cmdRef.table.xmlID', 'XML ID'),
      i18n.t('cmdRef.table.resModel', 'Res. Model'),
      i18n.t('cmdRef.table.resID', 'Res. ID'),
    ],
    rows,
  );
  return results;
}

export default {
  definition: i18n.t(
    'cmdRef.definition',
    "Show the referenced model and id of the given xmlid's",
  ),
  callback: cmdRef,
  detail: i18n.t(
    'cmdRef.detail',
    "Show the referenced model and id of the given xmlid's",
  ),
  args: [
    [
      ARG.List | ARG.String,
      ['x', 'xmlid'],
      true,
      i18n.t('cmdRef.args.xmlid', 'The XML-ID'),
    ],
  ],
  example: '-x base.main_company,base.model_res_partner',
};
