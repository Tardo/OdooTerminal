// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import type {CMDCallbackContext} from '@trash/interpreter';


export function startRequest(timeoutSecs: ?number): AbortController {
  const controller = new AbortController();
  if (timeoutSecs !== null && timeoutSecs !== undefined && timeoutSecs > 0) {
    setTimeout(() => controller.abort('timeout'), timeoutSecs * 1000);
  }
  return controller;
}

export function handleAbort(err: Error, ctx: CMDCallbackContext): boolean {
  if (err.name === 'AbortError') {
    ctx.screen.print(i18n.t('ai.utils.network.error.aborted', 'Request cancelled.'));
    return true;
  }
  return false;
}
