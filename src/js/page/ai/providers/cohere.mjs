// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import {DEFAULT_MAX_TOKENS} from '@ai/constants';
import {backgroundFetch} from '@ai/utils/relay_fetch';
import streamLines from '@ai/utils/stream_lines';
import toChatMessages from '@ai/utils/chat_messages';

export default async function streamRequestCohere(
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
    max_tokens: maxTokens !== null && maxTokens !== undefined ? maxTokens : DEFAULT_MAX_TOKENS,
  };

  if (stop !== null && stop !== undefined && stop.length > 0) {
    body.stop_sequences = stop;
  }

  if (tools !== null && tools !== undefined && tools.length > 0) {
    body.tools = tools.map(t => ({
      type: 'function',
      function: {name: t.name, description: t.description, parameters: t.parameters},
    }));
  }

  const response = await backgroundFetch(
    `${url}/v2/chat`,
    {method: 'POST', headers, body: JSON.stringify(body)},
    signal,
  );

  let fullResponse = '';
  let usage: ?TokenUsage = null;

  const toolCallsAccum: Map<number, {id: string, name: string, argsAccum: string}> = new Map();
  const toolCalls: Array<AIToolCall> = [];
  // Cohere's docs show both an "event: <type>" line and a "type" field inside the JSON body
  // for each SSE event, but published examples of the raw wire format (as opposed to SDK
  // object reprs) are scarce. Track the event: line too and fall back to it so the parser
  // doesn't depend on which one actually carries the discriminator.
  let currentEvent = '';

  for await (const trimmed of streamLines(response)) {
    if (!trimmed) {
      currentEvent = '';
      continue;
    }
    if (trimmed.startsWith('event: ')) {
      currentEvent = trimmed.slice(7);
      continue;
    }
    if (!trimmed.startsWith('data: ')) {
      continue;
    }

    try {
      const data = JSON.parse(trimmed.slice(6));
      const idx: number = data.index ?? 0;
      const eventType = data.type ?? currentEvent;

      if (eventType === 'content-delta') {
        const delta: string = data.delta?.message?.content?.text ?? '';
        if (delta) {
          fullResponse += delta;
          onDelta(delta);
        }
      } else if (eventType === 'tool-call-start') {
        const tc = data.delta?.message?.tool_calls;
        toolCallsAccum.set(idx, {
          id: tc?.id ?? '',
          name: tc?.function?.name ?? '',
          argsAccum: tc?.function?.arguments ?? '',
        });
      } else if (eventType === 'tool-call-delta') {
        const existing = toolCallsAccum.get(idx);
        if (existing !== undefined) {
          existing.argsAccum += data.delta?.message?.tool_calls?.function?.arguments ?? '';
        }
      } else if (eventType === 'tool-call-end') {
        const tc = toolCallsAccum.get(idx);
        if (tc !== undefined) {
          try {
            // $FlowFixMe[incompatible-type]
            const input: {[string]: mixed} = JSON.parse(tc.argsAccum || '{}');
            toolCalls.push({id: tc.id, name: tc.name, input});
          } catch (_) {
            toolCalls.push({id: tc.id, name: tc.name, input: {}});
          }
          toolCallsAccum.delete(idx);
        }
      } else if (eventType === 'message-end') {
        const tokens = data.delta?.usage?.tokens;
        if (tokens) {
          const inputTokens = tokens.input_tokens ?? 0;
          const outputTokens = tokens.output_tokens ?? 0;
          usage = {
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
          };
        }
      }
    } catch (_) {
      // Skip unparseable chunks
    }
  }

  return {text: fullResponse, toolCalls, usage};
}
