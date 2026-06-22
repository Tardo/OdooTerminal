// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';


export default async function streamRequestOpenAI(
  url: string,
  apiKey: ?string,
  model: string,
  messages: Array<AIMessage>,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
  stop?: ?Array<string>,
): Promise<{text: string, usage: ?TokenUsage}> {
  const headers: {[string]: string} = {
    'Content-Type': 'application/json',
  };
  if (apiKey !== null && apiKey !== undefined) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const body: {[string]: mixed} = {model, messages, stream: true, stream_options: {include_usage: true}, max_tokens: 4000};
  if (stop !== null && stop !== undefined && stop.length > 0) {
    body.stop = stop;
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
        const delta = data.choices?.[0]?.delta?.content;
        if (delta) {
          fullResponse += delta;
          onDelta(delta);
        }
      } catch (_) {
        // Skip unparseable chunks
      }
    }
  }

  return {text: fullResponse, usage};
}
