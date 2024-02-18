// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (values) {
  return i18n.t(
    'terminal.templates.deprecatedCommand',
    "** This command is deprecated, please use '{{cmd}}' instead.",
    {cmd: values.cmd},
  );
}
