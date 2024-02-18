// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (values) {
  return (
    `<span style='color: gray;'>${i18n.t('odoo.templates.metadata.createUID', 'Create UID')}</span>: ${values.create_uid}<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.metadata.createDate', 'Create Date')}</span>: ${values.create_date}<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.metadata.writeUID', 'Write UID')}</span>: ${values.write_uid}<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.metadata.writeDate', 'Write Date')}</span>: ${values.write_date}<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.metadata.noUpdate', 'No Update')}</span>: ${values.noupdate}<br>` +
    `<span style='color: gray;'>${i18n.t('odoo.templates.metadata.xmlID', 'XML-ID')}</span>: ${values.xmlid}`
  );
}
