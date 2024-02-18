// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (values) {
  return (
    `<span style='color: gray;'>${i18n.t('odoo.templates.whoami.login', 'Login')}</span>: ${values.login}<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.whoami.user', 'User')}</span>: ${values.display_name} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.users ${values.user_id}'>#${values.user_id}</span>)<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.whoami.partner', 'Partner')}</span>: ${values.partner[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.partner ${values.partner[0]}'>#${values.partner[0]}</span>)<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.whoami.activeCompany', 'Active Company')}</span>: ${values.company[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.company ${values.company[0]}'>#${values.company[0]}</span>)<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.whoami.inCompanies', 'In Companies')}</span>: ${values.companies}<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.whoami.inGroups', 'In Groups')}</span>: ${values.groups}`
  );
}
