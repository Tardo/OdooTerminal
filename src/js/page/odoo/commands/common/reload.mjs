// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import type {CMDDef} from '@tardo/trash/interpreter';

async function cmdReloadPage() {
  location.reload();
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdReload.definition', 'Reload current page'),
    category: 'system',
    callback: cmdReloadPage,
    detail: i18n.t('cmdReload.detail', 'Reload current page.'),
  };
}
