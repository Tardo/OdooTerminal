// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {DEFAULT_MAX_TOKENS} from '@ai/constants';


export default async function streamRequestAnthropic(
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
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (apiKey !== null && apiKey !== undefined) {
    headers['x-api-key'] = apiKey;
  }

  // Anthropic requires system as a top-level param, not inside messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const body: {[string]: mixed} = {
    model,
    max_tokens: maxTokens !== null && maxTokens !== undefined ? maxTokens : DEFAULT_MAX_TOKENS,
    messages: chatMessages,
    stream: true,
  };

  if (systemMessages.length > 0) {
    const firstSystem = systemMessages[0];
    body.system = firstSystem.content;
  }

  if (stop !== null && stop !== undefined && stop.length > 0) {
    body.stop_sequences = stop;
  }

  if (tools !== null && tools !== undefined && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
    body.tool_choice = {type: 'auto', disable_parallel_tool_use: true};
  }

  const response = await fetch(`${url}/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      i18n.t('ai.utils.network.error.httpError', 'HTTP error {{status}}', {status: response.status}) +
      '\n' +
      errorText,
    );
  }

  if (!response.body) {
    throw new Error(i18n.t('ai.utils.network.error.noStream', 'Server did not return a streaming response'));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';
  let buffer = '';
  let currentEvent = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;

  const toolCalls: Array<AIToolCall> = [];
  const pendingToolCalls: Map<number, {id: string, name: string, jsonAccum: string}> = new Map();

  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(
      value !== null && value !== undefined ? value : new Uint8Array(0),
      {stream: true},
    );

    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
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
        if (currentEvent === 'message_start') {
          const msgUsage = data.message?.usage;
          if (msgUsage) {
            inputTokens = msgUsage.input_tokens ?? 0;
            cacheCreationTokens = msgUsage.cache_creation_input_tokens ?? 0;
            cacheReadTokens = msgUsage.cache_read_input_tokens ?? 0;
          }
        } else if (currentEvent === 'content_block_start' && data.content_block?.type === 'tool_use') {
          const idx: number = data.index ?? 0;
          pendingToolCalls.set(idx, {
            id: data.content_block.id ?? '',
            name: data.content_block.name ?? '',
            jsonAccum: '',
          });
        } else if (currentEvent === 'content_block_delta') {
          if (data.delta?.type === 'text_delta') {
            const delta: string = data.delta.text ?? '';
            if (delta) {
              fullResponse += delta;
              onDelta(delta);
            }
          } else if (data.delta?.type === 'input_json_delta') {
            const idx: number = data.index ?? 0;
            const pending = pendingToolCalls.get(idx);
            if (pending !== undefined) {
              pending.jsonAccum += data.delta.partial_json ?? '';
            }
          }
        } else if (currentEvent === 'content_block_stop') {
          const idx: number = data.index ?? 0;
          const pending = pendingToolCalls.get(idx);
          if (pending !== undefined) {
            try {
              // $FlowFixMe[incompatible-type]
              const input: {[string]: mixed} = JSON.parse(pending.jsonAccum || '{}');
              toolCalls.push({id: pending.id, name: pending.name, input});
            } catch (_) {
              toolCalls.push({id: pending.id, name: pending.name, input: {}});
            }
            pendingToolCalls.delete(idx);
          }
        } else if (currentEvent === 'message_delta') {
          outputTokens = data.usage?.output_tokens ?? 0;
        }
      } catch (_) {
        // Skip unparseable chunks
      }
    }
  }

  const usage: TokenUsage = {
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    cache_creation_input_tokens: cacheCreationTokens,
    cache_read_input_tokens: cacheReadTokens,
  };

  return {text: fullResponse, toolCalls, usage};
}
