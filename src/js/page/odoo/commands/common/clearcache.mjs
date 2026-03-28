// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import {clearCache as clearSearchReadCache} from '@odoo/net_utils/cached_search_read';
import {clearCache as clearCallServiceCache} from '@odoo/net_utils/cached_call_service';
import {clearCache as clearCallModelMultiCache} from '@odoo/net_utils/cached_call_model_multi';
import type {CMDCallbackArgs, CMDCallbackContext, CMDDef} from '@trash/interpreter';

async function cmdClearCache(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext) {
  clearSearchReadCache();
  clearCallServiceCache();
  clearCallModelMultiCache();
  ctx.screen.print(
    i18n.t('cmdClearCache.result.success', '<strong>Cache cleared successfully</strong>'),
  );
  ctx.screen.print(
    i18n.t('cmdClearCache.result.info', 'The following caches have been cleared:'),
  );
  ctx.screen.print('  - Search/Read cache');
  ctx.screen.print('  - Service call cache');
  ctx.screen.print('  - Model multi-call cache');
}

export default function (): Partial<CMDDef> {
  return {
    definition: i18n.t('cmdClearCache.definition', 'Clear internal caches'),
    callback: cmdClearCache,
    detail: i18n.t(
      'cmdClearCache.detail',
      'Clears all internal caches used by the terminal. This is useful when cached data becomes stale, especially after Odoo upgrades or when working with Odoo 18+.',
    ),
  };
}
