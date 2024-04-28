// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

export default function (model: string, new_ids: $ReadOnlyArray<number>): string {
  const links = new_ids?.map(
    nid => `<span class='o_terminal_click o_terminal_cmd' data-cmd='view ${model} ${nid}'>${nid}</span>`,
  );
  return i18n.t('odoo.templates.recordCreated.sucess', '{{model}} record(s) created successfully: {{links}}', {
    model: model,
    links: links.join(', '),
  });
}
