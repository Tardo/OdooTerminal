// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {DEFAULT_MAX_TOKENS} from '@ai/constants';
import {backgroundFetch} from '@ai/utils/relay_fetch';
import {formatHTTPError} from '@ai/utils/network';

type GeminiPart = {[string]: mixed};
type GeminiContent = {role: string, parts: Array<GeminiPart>};

// Gemini's function-declaration "parameters" field is a strict protobuf Schema, not arbitrary
// JSON Schema: it has no $schema/$id/additionalProperties/examples/default fields, and "type"
// must be a single enum value rather than a union array. Our own AGENT_TOOLS schemas are already
// clean, but tool schemas discovered from MCP servers are ordinary JSON Schema (commonly emitted
// by Zod-based frameworks with a top-level $schema and `type: ["string", "null"]` for nullable
// fields) and Gemini rejects the request outright — 400 INVALID_ARGUMENT — if either shows up
// anywhere in the (recursively walked) schema tree. OpenAI/Anthropic/Cohere all accept the same
// schemas unmodified, so this sanitizing is Gemini-only.
const UNSUPPORTED_SCHEMA_KEYS = new Set(['$schema', '$id', 'additionalProperties', 'examples', 'default']);

function sanitizeSchemaForGemini(schema: mixed): mixed {
  if (Array.isArray(schema)) {
    return schema.map(sanitizeSchemaForGemini);
  }
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }
  const out: {[string]: mixed} = {};
  for (const key of Object.keys(schema)) {
    if (UNSUPPORTED_SCHEMA_KEYS.has(key)) {
      continue;
    }
    const value = schema[key];
    if (key === 'type' && Array.isArray(value)) {
      const nonNullTypes = value.filter(v => v !== 'null');
      out.type = nonNullTypes.length > 0 ? nonNullTypes[0] : (value[0] ?? 'string');
      if (value.includes('null')) {
        out.nullable = true;
      }
      continue;
    }
    out[key] = sanitizeSchemaForGemini(value);
  }
  return out;
}

// Gemini 3 requires every replayed functionCall part to carry the thoughtSignature it was
// issued with (echoed back verbatim) — a 400 otherwise. Only the FIRST functionCall in a
// parallel-call turn actually gets one from the model; later ones in that same turn, calls
// synthesized outside a Gemini turn, or history from a provider switch never have one, so a
// documented dummy value stands in for those. See
// https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures
const DUMMY_THOUGHT_SIGNATURE = 'skip_thought_signature_validator';

// Gemini's functionCall/functionResponse are keyed by name, not id (the wire format has
// no id field at all). Our internal AIToolCall/tool_result blocks are id-keyed, so ids are
// synthesized on the way in (see streamRequestGemini) and resolved back to names here via a
// running id->name map built while walking the conversation in order (a tool_use block always
// precedes the tool_result block that references it).
function toGeminiContents(messages: Array<AIMessage>): {systemInstruction: ?{parts: Array<{text: string}>}, contents: Array<GeminiContent>} {
  const systemParts: Array<{text: string}> = [];
  const contents: Array<GeminiContent> = [];
  const callNameById: Map<string, string> = new Map();

  for (const msg of messages) {
    if (msg.role === 'system') {
      let text = '';
      if (typeof msg.content === 'string') {
        text = msg.content;
      } else {
        for (const block of msg.content) {
          if (block.type === 'text') {
            text += block.text;
          }
        }
      }
      if (text) {
        systemParts.push({text});
      }
      continue;
    }

    const role = msg.role === 'assistant' ? 'model' : 'user';
    const blocks: Array<AIContentBlock> = typeof msg.content === 'string' ? [{type: 'text', text: msg.content}] : msg.content;
    const parts: Array<GeminiPart> = [];

    for (const block of blocks) {
      if (block.type === 'text') {
        if (block.text) {
          parts.push({text: block.text});
        }
      } else if (block.type === 'tool_use') {
        callNameById.set(block.id, block.name);
        parts.push({
          functionCall: {name: block.name, args: block.input},
          thoughtSignature: block.thoughtSignature ?? DUMMY_THOUGHT_SIGNATURE,
        });
      } else if (block.type === 'tool_result') {
        const name = callNameById.get(block.tool_use_id) ?? block.tool_use_id;
        parts.push({functionResponse: {name, response: {content: block.content}}});
      } else if (block.type === 'image' || block.type === 'document') {
        parts.push({inlineData: {mimeType: block.source.media_type, data: block.source.data}});
      }
    }

    if (parts.length > 0) {
      contents.push({role, parts});
    }
  }

  return {
    systemInstruction: systemParts.length > 0 ? {parts: systemParts} : null,
    contents,
  };
}

export default async function streamRequestGemini(
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
    headers['x-goog-api-key'] = apiKey;
  }

  const {systemInstruction, contents} = toGeminiContents(messages);

  const generationConfig: {[string]: mixed} = {
    maxOutputTokens: maxTokens !== null && maxTokens !== undefined ? maxTokens : DEFAULT_MAX_TOKENS,
  };
  if (stop !== null && stop !== undefined && stop.length > 0) {
    generationConfig.stopSequences = stop;
  }

  const body: {[string]: mixed} = {contents, generationConfig};
  if (systemInstruction !== null && systemInstruction !== undefined) {
    body.systemInstruction = systemInstruction;
  }
  if (tools !== null && tools !== undefined && tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: tools.map(t => ({name: t.name, description: t.description, parameters: sanitizeSchemaForGemini(t.parameters)})),
      },
    ];
  }

  const response = await backgroundFetch(
    `${url}/models/${model}:streamGenerateContent?alt=sse`,
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
  let blockReason: ?string = null;
  let callIdx = 0;

  const toolCalls: Array<AIToolCall> = [];

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
      if (!trimmed || !trimmed.startsWith('data: ')) {
        continue;
      }

      try {
        const data = JSON.parse(trimmed.slice(6));
        const reason = data.promptFeedback?.blockReason;
        if (reason) {
          blockReason = String(reason);
        }

        const parts = data.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (typeof part.text === 'string' && part.text) {
              fullResponse += part.text;
              onDelta(part.text);
            } else if (part.functionCall) {
              toolCalls.push({
                id: `call_${callIdx++}`,
                name: String(part.functionCall.name ?? ''),
                input: part.functionCall.args ?? {},
                thoughtSignature: typeof part.thoughtSignature === 'string' ? part.thoughtSignature : null,
              });
            }
          }
        }

        if (data.usageMetadata) {
          usage = {
            prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
            completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
            total_tokens: data.usageMetadata.totalTokenCount ?? 0,
          };
        }
      } catch (_) {
        // Skip unparseable chunks
      }
    }
  }

  if (fullResponse === '' && toolCalls.length === 0 && blockReason !== null && blockReason !== undefined) {
    throw new Error(
      i18n.t('ai.providers.gemini.error.blocked', 'Gemini blocked the response ({{reason}})', {reason: blockReason}),
    );
  }

  return {text: fullResponse, toolCalls, usage};
}
