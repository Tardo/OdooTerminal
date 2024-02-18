// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (values) {
  const links = values.new_ids.map(
    nid =>
      `<span class='o_terminal_click o_terminal_cmd' data-cmd='view ${values.model} ${nid}'>${nid}</span>`,
  );
  return i18n.t(
    'odoo.templates.recordCreated.sucess',
    '{{model}} record(s) created successfully: {{links}}',
    {
      model: values.model,
      links: links.join(', '),
    },
  );
}
