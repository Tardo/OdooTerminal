// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import searchRead from '@odoo/orm/search_read';
import callModelMulti from '@odoo/osv/call_model_multi';
import renderWhoami from '@odoo/templates/whoami';
import renderWhoamiListItem from '@odoo/templates/whoami_group_item';
import getUID from '@odoo/utils/get_uid';

async function cmdShowWhoAmI(kwargs, screen) {
  const result = await searchRead(
    'res.users',
    [['id', '=', getUID()]],
    [
      'id',
      'display_name',
      'login',
      'partner_id',
      'company_id',
      'company_ids',
      'groups_id',
    ],
    this.getContext(),
  );
  if (!result.length) {
    throw new Error(
      i18n.t('cmdWhoami.error.noLogin', "Oops! can't get the login :/"),
    );
  }
  const record = result[0];
  const result_tasks = await Promise.all([
    callModelMulti(
      'res.groups',
      record.groups_id,
      'name_get',
      null,
      null,
      this.getContext(),
    ),
    callModelMulti(
      'res.company',
      record.company_ids,
      'name_get',
      null,
      null,
      this.getContext(),
    ),
  ]);
  let groups_list = '';
  for (const group of result_tasks[0]) {
    groups_list += renderWhoamiListItem({
      name: group[1],
      model: 'res.groups',
      id: group[0],
    });
  }
  let companies_list = '';
  for (const company of result_tasks[1]) {
    companies_list += renderWhoamiListItem({
      name: company[1],
      model: 'res.company',
      id: company[0],
    });
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
  screen.print(renderWhoami(template_values));
  return template_values;
}

export default {
  definition: i18n.t('cmdWhoami.definition', 'Know current user login'),
  callback: cmdShowWhoAmI,
  detail: i18n.t('cmdWhoami.detail', 'Shows current user login'),
};
