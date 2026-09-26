// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {DEFAULT_MAX_TOKENS} from '@ai/constants';
import {backgroundFetch} from '@ai/utils/relay_fetch';
import streamLines from '@ai/utils/stream_lines';
import toChatMessages from '@ai/utils/chat_messages';

export default async function streamRequestOpenAI(
  url: string,
  apiKey: ?string,
  model: string,
  messages: Array<AIMessage>,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
  stop?: ?Array<string>,
  maxTokens?: ?number,
  tools?: ?Array<AIToolDef>,
  // Best-effort thinking control for OpenAI-compatible backends — there's no single param that
  // works everywhere, so this sends whichever convention matches the level:
  // - 'low'/'medium'/'high': the real OpenAI `reasoning_effort` field (also honoured by
  //   llama.cpp's gpt-oss/harmony support). Reasoning-only models require this to be set;
  //   non-reasoning models are likely to reject it — that's why it's only sent when requested.
  // - 'off': `chat_template_kwargs.enable_thinking = false`, the llama.cpp/vLLM convention for
  //   Qwen3-style hybrid models. Harmless no-op for templates that don't read that kwarg.
  reasoningEffort?: ?string,
): Promise<AIStreamResult> {
  const headers: {[string]: string} = {
    'Content-Type': 'application/json',
  };
  if (apiKey !== null && apiKey !== undefined) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const body: {[string]: mixed} = {
    model,
    messages: toChatMessages(messages),
    stream: true,
    stream_options: {include_usage: true},
    max_tokens: maxTokens !== null && maxTokens !== undefined ? maxTokens : DEFAULT_MAX_TOKENS,
  };

  if (stop !== null && stop !== undefined && stop.length > 0) {
    body.stop = stop;
  }

  if (tools !== null && tools !== undefined && tools.length > 0) {
    body.tools = tools.map(t => ({
      type: 'function',
      function: {name: t.name, description: t.description, parameters: t.parameters},
    }));
    body.parallel_tool_calls = false;
  }

  if (reasoningEffort === 'off') {
    body.chat_template_kwargs = {enable_thinking: false};
  } else if (reasoningEffort === 'low' || reasoningEffort === 'medium' || reasoningEffort === 'high') {
    body.reasoning_effort = reasoningEffort;
  }

  const response = await backgroundFetch(
    `${url}/chat/completions`,
    {method: 'POST', headers, body: JSON.stringify(body)},
    signal,
  );

  let fullResponse = '';
  // Keep reasoning separate from the answer so callers can distinguish reasoning-only replies.
  let reasoningResponse = '';
  let usage: ?TokenUsage = null;

  const toolCallsAccum: Map<number, {id: string, name: string, argsAccum: string}> = new Map();

  for await (const trimmed of streamLines(response)) {
    if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) {
      continue;
    }

    try {
      const data = JSON.parse(trimmed.slice(6));
      if (data.usage) {
        usage = data.usage;
      }
      const delta = data.choices?.[0]?.delta;
      if (!delta) {
        continue;
      }
      if (delta.content) {
        fullResponse += delta.content;
        onDelta(delta.content);
      }
      if (delta.reasoning_content) {
        reasoningResponse += delta.reasoning_content;
      }
      const tcs = delta.tool_calls;
      if (Array.isArray(tcs)) {
        for (const tc of tcs) {
          const idx: number = tc.index ?? 0;
          const existing = toolCallsAccum.get(idx);
          if (existing !== undefined) {
            existing.argsAccum += tc.function?.arguments ?? '';
          } else {
            toolCallsAccum.set(idx, {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              argsAccum: tc.function?.arguments ?? '',
            });
          }
        }
      }
    } catch (_) {
      // Skip unparseable chunks
    }
  }

  const toolCalls: Array<AIToolCall> = [];
  for (const [, tc] of toolCallsAccum) {
    try {
      // $FlowFixMe[incompatible-type]
      const input: {[string]: mixed} = JSON.parse(tc.argsAccum || '{}');
      toolCalls.push({id: tc.id, name: tc.name, input});
    } catch (_) {
      toolCalls.push({id: tc.id, name: tc.name, input: {}});
    }
  }

  // Some backends (llama.cpp with gpt-oss/harmony-style native tool-calling) fall back to
  // streaming the raw, un-parsed chat-template tokens as plain content when a weak/quantized
  // model produces a tool call the server's grammar can't extract (logged there as
  // "unparsed peg-native output"). Without this check that garbage is shown to the user as if
  // it were the model's real final answer, with no indication anything went wrong.
  if (toolCalls.length === 0 && /<\|(?:start|end|channel|message|constrain)\|>/.test(fullResponse)) {
    throw new Error(
      i18n.t(
        'ai.utils.network.error.malformedToolCall',
        'The backend returned an unparsed tool-call attempt (raw chat-template tokens) instead of a valid response. ' +
          'The model likely lacks the capacity for reliable tool calling — try a stronger model or a smaller/simpler prompt.',
      ),
    );
  }

  return {
    text: fullResponse,
    toolCalls,
    usage,
    reasoning: reasoningResponse.length > 0 ? reasoningResponse : undefined,
  };
}
