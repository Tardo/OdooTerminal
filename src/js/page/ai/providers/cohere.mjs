// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {DEFAULT_MAX_TOKENS} from '@ai/constants';
import {backgroundFetch} from '@ai/utils/relay_fetch';
import {formatHTTPError} from '@ai/utils/network';


// Cohere v2 chat converged on an OpenAI-shaped messages array (role: system/user/assistant/tool,
// tool_calls[].function.arguments as a JSON string, tool_call_id, image_url data-uri blocks) —
// this mirrors toOpenAIMessages in openai.mjs structurally, kept as its own copy rather than a
// shared import so each provider file stays independently modifiable (existing project pattern).
function toCohereMessages(messages: Array<AIMessage>): Array<{[string]: mixed}> {
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
      const imageParts: Array<{[string]: mixed}> = [];
      for (const block of content) {
        if (block.type === 'tool_result') {
          result.push({role: 'tool', tool_call_id: block.tool_use_id, content: block.content});
        } else if (block.type === 'text') {
          textParts.push(block.text);
        } else if (block.type === 'image') {
          imageParts.push({
            type: 'image_url',
            image_url: {url: `data:${block.source.media_type};base64,${block.source.data}`},
          });
        } else if (block.type === 'document') {
          // Cohere's user-message content blocks document text/image_url only; include as text notice
          textParts.push(`[PDF document attached — inline PDF is not supported by this provider]`);
        }
      }
      if (textParts.length > 0 || imageParts.length > 0) {
        if (imageParts.length === 0) {
          result.push({role: 'user', content: textParts.join('')});
        } else {
          const parts: Array<{[string]: mixed}> = [];
          if (textParts.length > 0) {
            parts.push({type: 'text', text: textParts.join('')});
          }
          parts.push(...imageParts);
          result.push({role: 'user', content: parts});
        }
      }
    } else {
      // system and other roles: extract text content (Cohere keeps system as a regular message)
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
    messages: toCohereMessages(messages),
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatHTTPError(response.status, errorText));
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
  const toolCalls: Array<AIToolCall> = [];
  // Cohere's docs show both an "event: <type>" line and a "type" field inside the JSON body
  // for each SSE event, but published examples of the raw wire format (as opposed to SDK
  // object reprs) are scarce. Track the event: line too and fall back to it so the parser
  // doesn't depend on which one actually carries the discriminator.
  let currentEvent = '';

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
  }

  return {text: fullResponse, toolCalls, usage};
}
