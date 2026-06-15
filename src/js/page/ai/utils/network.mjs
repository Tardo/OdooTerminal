// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import type {CMDCallbackContext} from '@trash/interpreter';


export async function streamRequest(
  url: string,
  apiKey: ?string,
  model: string,
  messages: Array<{role: string, content: string}>,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
): Promise<string> {
  const headers: {[string]: string} = {
    'Content-Type': 'application/json',
  };
  if (apiKey !== null && apiKey !== undefined) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({model, messages, stream: true}),
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

  return fullResponse;
}

export function startRequest(timeoutSecs: ?number): AbortController {
  const controller = new AbortController();
  if (timeoutSecs !== null && timeoutSecs !== undefined && timeoutSecs > 0) {
    setTimeout(() => controller.abort('timeout'), timeoutSecs * 1000);
  }
  return controller;
}

export function handleAbort(err: Error, ctx: CMDCallbackContext): boolean {
  if (err.name === 'AbortError') {
    ctx.screen.print(i18n.t('ai.utils.network.error.aborted', 'Request cancelled.'));
    return true;
  }
  return false;
}
