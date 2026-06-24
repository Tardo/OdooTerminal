// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {DEFAULT_MAX_TOKENS} from '@ai/constants';


function toOpenAIMessages(messages: Array<AIMessage>): Array<{[string]: mixed}> {
  const result: Array<{[string]: mixed}> = [];
  for (const msg of messages) {
    const {role, content} = msg;
    if (typeof content === 'string') {
      result.push({role, content});
      continue;
    }
    if (role === 'assistant') {
      let textContent = '';
      const toolCalls: Array<{[string]: mixed}> = [];
      for (const block of content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {name: block.name, arguments: JSON.stringify(block.input)},
          });
        }
      }
      if (toolCalls.length > 0) {
        // $FlowFixMe[incompatible-call]
        result.push({role: 'assistant', content: textContent || null, tool_calls: toolCalls});
      } else {
        result.push({role: 'assistant', content: textContent});
      }
    } else if (role === 'user') {
      const textParts: Array<string> = [];
      for (const block of content) {
        if (block.type === 'tool_result') {
          result.push({role: 'tool', tool_call_id: block.tool_use_id, content: block.content});
        } else if (block.type === 'text') {
          textParts.push(block.text);
        }
      }
      if (textParts.length > 0) {
        result.push({role: 'user', content: textParts.join('')});
      }
    } else {
      // system and other roles: extract text content
      let textContent = '';
      for (const block of content) {
        if (block.type === 'text') {
          textContent += block.text;
        }
      }
      result.push({role, content: textContent});
    }
  }
  return result;
}


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
): Promise<AIStreamResult> {
  const headers: {[string]: string} = {
    'Content-Type': 'application/json',
  };
  if (apiKey !== null && apiKey !== undefined) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const body: {[string]: mixed} = {
    model,
    messages: toOpenAIMessages(messages),
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

  const response = await fetch(`${url}/chat/completions`, {
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
  let usage: ?TokenUsage = null;

  const toolCallsAccum: Map<number, {id: string, name: string, argsAccum: string}> = new Map();

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

  return {text: fullResponse, toolCalls, usage};
}
