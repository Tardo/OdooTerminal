// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default function (
  create_uid: number,
  create_date: string,
  write_uid: number,
  write_date: string,
  noupdate: boolean,
  xmlid: string,
): string {
  return (
    `<span class='text-info'>${i18n.t('odoo.templates.metadata.createUID', 'Create UID')}</span>: ${create_uid}<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.metadata.createDate', 'Create Date')}</span>: ${create_date}<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.metadata.writeUID', 'Write UID')}</span>: ${write_uid}<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.metadata.writeDate', 'Write Date')}</span>: ${write_date}<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.metadata.noUpdate', 'No Update')}</span>: ${noupdate ? i18n.t('Yes', 'Yes') : i18n.t('No', 'No')}<br>` +
    `<span class='text-info'>${i18n.t('odoo.templates.metadata.xmlID', 'XML-ID')}</span>: ${xmlid}`
  );
}
