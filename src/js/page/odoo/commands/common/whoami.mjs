// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import searchRead from '@odoo/orm/search_read';
import callModelMulti from '@odoo/osv/call_model_multi';
import renderWhoami from '@odoo/templates/whoami';
import renderWhoamiListItem from '@odoo/templates/whoami_group_item';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getUID from '@odoo/utils/get_uid';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';
import type Terminal from '@odoo/terminal';

async function cmdShowWhoAmI(this: Terminal, kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  const result = await searchRead(
    'res.users',
    [['id', '=', getUID()]],
    ['id', 'display_name', 'login', 'partner_id', 'company_id', 'company_ids', 'groups_id'],
    this.getContext(),
  );
  if (!result.length) {
    throw new Error(i18n.t('cmdWhoami.error.noLogin', "Oops! can't get the login :/"));
  }
  const record = result[0];
  const OdooVerMajor = getOdooVersion('major');
  const OdooVerMinor = getOdooVersion('minor');
  const groups_list = [];
  const companies_list = [];
  if (typeof OdooVerMajor === 'number' && typeof OdooVerMinor === 'number' && OdooVerMajor >= 17 && OdooVerMinor > 1) {
    const result_tasks = await Promise.all([
      searchRead(
        'res.groups',
        [['id', 'in', record.groups_id]],
        ['display_name'],
        this.getContext(),
      ),
      searchRead(
        'res.company',
        [['id', 'in', record.company_ids]],
        ['display_name'],
        this.getContext(),
      ),
    ]);
    for (const group of result_tasks[0]) {
      groups_list.push(renderWhoamiListItem(group.display_name, 'res.groups', group.id));
    }
    for (const company of result_tasks[1]) {
      companies_list.push(renderWhoamiListItem(company.display_name, 'res.company', company.id));
    }
  } else {
    if (typeof OdooVerMajor === 'number' && OdooVerMajor >= 18) {
      const result_tasks = await Promise.all([
        searchRead(
          'res.groups',
          [['id', 'in', record.groups_id]],
          ['display_name'],
          this.getContext(),
        ),
        searchRead(
          'res.company',
          [['id', 'in', record.company_ids]],
          ['display_name'],
          this.getContext(),
        ),
      ]);

      for (const group of result_tasks[0]) {
        groups_list.push(renderWhoamiListItem(group.display_name, 'res.groups', group.id));
      }
      for (const company of result_tasks[1]) {
        companies_list.push(renderWhoamiListItem(company.display_name, 'res.company', company.id));
      }
    } else {
      const result_tasks = await Promise.all([
        callModelMulti<$ReadOnlyArray<[number, string]>>(
          'res.groups',
          record.groups_id,
          'name_get',
          null,
          null,
          this.getContext(),
        ),
        callModelMulti<$ReadOnlyArray<[number, string]>>(
          'res.company',
          record.company_ids,
          'name_get',
          null,
          null,
          this.getContext(),
        ),
      ]);

      for (const group of result_tasks[0]) {
        groups_list.push(renderWhoamiListItem(group[1], 'res.groups', group[0]));
      }
      for (const company of result_tasks[1]) {
        companies_list.push(renderWhoamiListItem(company[1], 'res.company', company[0]));
      }
    }
  }

  const template_values = {
    login: record.login,
    display_name: record.display_name,
    user_id: record.id,
    partner: record.partner_id,
    company: record.company_id,
    companies: companies_list,
    groups: groups_list,
  };
  ctx.screen.print(
    renderWhoami(
      template_values.login,
      template_values.display_name,
      template_values.user_id,
      template_values.partner,
      template_values.company,
      template_values.companies,
      template_values.groups,
    ),
  );
  return template_values;
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdWhoami.definition', 'Know current user login'),
    callback: cmdShowWhoAmI,
    detail: i18n.t('cmdWhoami.detail', 'Shows current user login'),
  };
}
