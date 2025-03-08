// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';

/**
 * Return a friendly error exception
 */
// $FlowFixMe[unclear-type]
export default function (err: Object): string {
  if (err.name !== 'QuotaExceededError') {
    return '';
  }
  return (
    "<span class='text-warning'>" +
    `<strong>${i18n.t('checkStorageError.warning', 'WARNING: ')}</strong> ` +
    i18n.t(
      'checkStorageError.message',
      'Clear the ' +
        "<strong class='o_terminal_click o_terminal_cmd text-danger' " +
        "data-cmd='clear screen'>screen</strong> or/and " +
        "<strong class='o_terminal_click o_terminal_cmd text-danger' " +
        "data-cmd='clear history'>history</strong> " +
        'to free storage space. Browser <u>Storage Quota Exceeded</u>' +
        ' 😭',
    ) +
    '</strong><br>'
  );
}
