// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {aiState} from '@ai/state';
import type {CMDCallbackArgs, CMDCallbackContext} from '@trash/interpreter';


export default async function cmdAIConnect(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<void> {
  const url: string = kwargs.url;
  const apiKey: ?string = kwargs.api_key;
  const model: ?string = kwargs.model;
  const timeout: ?number = kwargs.timeout;
  const provider: ?string = kwargs.provider;

  aiState.url = url;
  aiState.apiKey = apiKey;
  aiState.model = model;
  aiState.timeout = timeout !== null && timeout !== undefined && timeout > 0 ? timeout : null;
  aiState.provider = provider !== null && provider !== undefined && provider !== '' ? provider : null;

  const info = [
    `URL: ${url}`,
    apiKey !== null && apiKey !== undefined ? `API Key: ${apiKey.slice(0, 8)}...` : 'API Key: (none)',
    model !== null && model !== undefined ? `Model: ${model}` : 'Model: (default)',
    aiState.timeout !== null && aiState.timeout !== undefined ? `Timeout: ${aiState.timeout}s` : 'Timeout: (none)',
    aiState.provider !== null && aiState.provider !== undefined ? `Provider: ${aiState.provider}` : 'Provider: openai',
  ].join('\n');

  ctx.screen.print(i18n.t('cmdAI.connect.result.connected', 'AI Server connected'));
  ctx.screen.print(info, false);
}
