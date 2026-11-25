// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {aiRuntime} from '@ai/state';
import type {CMDCallbackContext} from '@tardo/trash/interpreter';


export default function cmdAIStop(ctx: CMDCallbackContext): void {
  if (!aiRuntime.run && !aiRuntime.controller) {
    ctx.screen.print(i18n.t('cmdAI.stop.noRequest', 'No active AI request to stop.'));
    return;
  }
  aiRuntime.run?.abort('user');
  aiRuntime.controller?.abort('user');
}
