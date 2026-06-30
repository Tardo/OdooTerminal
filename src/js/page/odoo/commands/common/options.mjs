// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import postMessage from '@common/utils/post_message';
import type {CMDDef} from '@trash/interpreter';

async function cmdOptions() {
  postMessage('ODOO_TERM_OPEN_OPTIONS', {});
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdOptions.definition', 'Open extension options'),
    callback: cmdOptions,
    detail: i18n.t('cmdOptions.detail', 'Open the OdooTerminal extension options page.'),
  };
}
