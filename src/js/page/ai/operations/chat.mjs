// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {aiState, aiRuntime} from '@ai/state';
import buildHTMLFormatPrompt from '@ai/prompts/html_format';
import {streamRequest} from '@ai/providers';
import {startRequest, handleAbort} from '@ai/utils/network';
import type {CMDCallbackArgs, CMDCallbackContext} from '@trash/interpreter';


export default async function cmdAIChat(kwargs: CMDCallbackArgs, ctx: CMDCallbackContext): Promise<void> {
  if (aiState.url === null || aiState.url === undefined) {
    throw new Error(i18n.t('cmdAI.chat.error.notConfigured', 'Not connected. Use "ai connect" first'));
  }
  const url: string = aiState.url;

  const prompt: string = kwargs.prompt;
  const model: string =
    kwargs.model !== null && kwargs.model !== undefined
      ? kwargs.model
      : aiState.model !== null && aiState.model !== undefined
        ? aiState.model
        : 'default';
  const timeoutSecs: ?number =
    kwargs.timeout !== null && kwargs.timeout !== undefined ? kwargs.timeout : aiState.timeout;
  const chatController = startRequest(timeoutSecs);
  aiRuntime.controller = chatController;

  ctx.screen.print(i18n.t('cmdAI.chat.result.sending', 'Sending request...'), false);
  ctx.screen.print('--- AI Response (' + model + ') ---', false);

  try {
    const {usage} = await streamRequest(url, aiState.apiKey, model, [{role: 'system', content: buildHTMLFormatPrompt()}, {role: 'user', content: prompt}], chatController.signal, delta => {
      ctx.screen.print(delta, true);
    }, null, aiState.maxTokens);
    ctx.screen.print('');
    if (usage !== null && usage !== undefined) {
      ctx.screen.print(
        i18n.t('cmdAI.tokens.usage', 'Tokens: {{prompt}} in / {{completion}} out ({{total}} total)', {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens,
        }),
        false,
        'agent-token-usage',
      );
    }
  } catch (err) {
    if (!handleAbort(err, ctx)) {
      ctx.screen.eprint(i18n.t('cmdAI.chat.error.requestFailed', 'Request failed: ') + err.message, false, 'error_message');
      throw err;
    }
  } finally {
    aiRuntime.controller = null;
  }
}
