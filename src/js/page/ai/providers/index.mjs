// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {aiState} from '@ai/state';
import streamRequestOpenAI from '@ai/providers/openai';
import streamRequestAnthropic from '@ai/providers/anthropic';
import streamRequestGemini from '@ai/providers/gemini';
import streamRequestCohere from '@ai/providers/cohere';


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
  // Defaults to the globally active connection's provider (aiState.provider) — pass this
  // explicitly for a one-off call against a DIFFERENT connection (e.g. the pet guardian using
  // its own dedicated provider) so it doesn't depend on / interfere with the global aiState.
  providerOverride?: ?string,
  // openai provider only for now — see reasoningEffort in providers/openai.mjs. Anthropic/Gemini
  // use structurally different "extended thinking" APIs (separate content-block types in the
  // stream); wiring those up needs its own pass, not a same-shaped param here.
  reasoning?: ?string,
): Promise<AIStreamResult> {
  const provider = providerOverride !== null && providerOverride !== undefined ? providerOverride : aiState.provider;
  if (provider === 'anthropic') {
    return streamRequestAnthropic(url, apiKey, model, messages, signal, onDelta, stop, maxTokens, tools);
  } else if (provider === 'gemini') {
    return streamRequestGemini(url, apiKey, model, messages, signal, onDelta, stop, maxTokens, tools);
  } else if (provider === 'cohere') {
    return streamRequestCohere(url, apiKey, model, messages, signal, onDelta, stop, maxTokens, tools);
  }
  return streamRequestOpenAI(url, apiKey, model, messages, signal, onDelta, stop, maxTokens, tools, reasoning);
}
