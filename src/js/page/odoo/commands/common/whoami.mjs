// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import searchRead from '@odoo/orm/search_read';
import callModelMulti from '@odoo/osv/call_model_multi';
import renderWhoami from '@odoo/templates/whoami';
import renderWhoamiListItem from '@odoo/templates/whoami_group_item';
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
  const groups_list = [];
  for (const group of result_tasks[0]) {
    groups_list.push(renderWhoamiListItem(group[1], 'res.groups', group[0]));
  }
  const companies_list = [];
  for (const company of result_tasks[1]) {
    companies_list.push(renderWhoamiListItem(company[1], 'res.company', company[0]));
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
