// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default function (
  login: string,
  display_name: string,
  user_id: number,
  partner: OdooMany2One,
  company: OdooMany2One,
  companies: $ReadOnlyArray<string>,
  groups: $ReadOnlyArray<string>,
): string {
  return (
    `<span class='text-info'>${i18n.t('odoo.templates.whoami.login', 'Login')}</span>: ${login}<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.whoami.user', 'User')}</span>: ${display_name} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.users ${user_id}'>#${user_id}</span>)<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.whoami.partner', 'Partner')}</span>: ${partner[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.partner ${partner[0]}'>#${partner[0]}</span>)<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.whoami.activeCompany', 'Active Company')}</span>: ${company[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.company ${company[0]}'>#${company[0]}</span>)<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.whoami.inCompanies', 'In Companies')}</span>: ${companies.join('')}<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.whoami.inGroups', 'In Groups')}</span>: ${groups.join()}`
  );
}
