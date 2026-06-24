// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {aiState} from '@ai/state';
import streamRequestOpenAI from '@ai/providers/openai';
import streamRequestAnthropic from '@ai/providers/anthropic';


export function streamRequest(
  url: string,
  apiKey: ?string,
  model: string,
  messages: Array<AIMessage>,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
  stop?: ?Array<string>,
  maxTokens?: ?number,
  tools?: ?Array<AIToolDef>,
): Promise<AIStreamResult> {
  if (aiState.provider === 'anthropic') {
    return streamRequestAnthropic(url, apiKey, model, messages, signal, onDelta, stop, maxTokens, tools);
  }
  return streamRequestOpenAI(url, apiKey, model, messages, signal, onDelta, stop, maxTokens, tools);
}
