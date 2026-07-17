// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {backgroundFetch} from '@ai/utils/relay_fetch';

/**
 * Lists the available model ids for a provider connection, via the background
 * relay (see relay_fetch.mjs) so the request isn't subject to the page's CORS
 * restrictions.
 */
export default async function listModels(
  url: string,
  apiKey: ?string,
  provider: ?string,
  signal: AbortSignal,
): Promise<Array<string>> {
  const isAnthropic = provider === 'anthropic';
  const headers: {[string]: string} = {'Content-Type': 'application/json'};
  if (isAnthropic) {
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    if (apiKey !== null && apiKey !== undefined) {
      headers['x-api-key'] = apiKey;
    }
  } else if (apiKey !== null && apiKey !== undefined) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const endpoint = isAnthropic ? `${url}/v1/models` : `${url}/models`;
  const response = await backgroundFetch(endpoint, {method: 'GET', headers}, signal);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (!response.body) {
    return [];
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    full += decoder.decode(value !== null && value !== undefined ? value : new Uint8Array(0), {stream: true});
  }
  const json = JSON.parse(full);
  const items = json.data || [];
  return items.map((m) => m.id).filter(Boolean).sort();
}
