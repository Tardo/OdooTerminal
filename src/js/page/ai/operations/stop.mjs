// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {aiRuntime} from '@ai/state';
import type {CMDCallbackContext} from '@trash/interpreter';


export default function cmdAIStop(ctx: CMDCallbackContext): void {
  if (aiRuntime.controller === null || aiRuntime.controller === undefined) {
    ctx.screen.print(i18n.t('cmdAI.stop.noRequest', 'No active AI request to stop.'));
    return;
  }
  aiRuntime.controller.abort('user');
}
