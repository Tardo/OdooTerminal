// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// Shared "list available models for a provider" logic — the header/endpoint shaping and
// per-provider response parsing are identical whether the request leaves from the page
// (relayed through the background service worker, see @ai/utils/list_models) or from the
// extension's own Options page (plain fetch — it isn't subject to the tab's CORS/CSP, so it
// doesn't need the relay). Only the transport differs, injected as `fetcher`.

export type ModelsFetchResponse = {
  ok: boolean,
  status: number,
  body: ?{getReader: () => {read: () => Promise<{done: boolean, value?: ?Uint8Array}>}},
};
export type ModelsFetcher = (
  url: string,
  init: {method: string, headers: {[string]: string}},
  signal: AbortSignal,
) => Promise<ModelsFetchResponse>;

export default async function listModels(
  url: string,
  apiKey: ?string,
  provider: ?string,
  signal: AbortSignal,
  fetcher: ModelsFetcher,
): Promise<Array<string>> {
  const isAnthropic = provider === 'anthropic';
  const isGemini = provider === 'gemini';
  const isCohere = provider === 'cohere';
  const headers: {[string]: string} = {'Content-Type': 'application/json'};
  if (isAnthropic) {
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    if (apiKey !== null && apiKey !== undefined) {
      headers['x-api-key'] = apiKey;
    }
  } else if (isGemini) {
    if (apiKey !== null && apiKey !== undefined) {
      headers['x-goog-api-key'] = apiKey;
    }
  } else if (apiKey !== null && apiKey !== undefined) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  // Cohere's chat endpoint is v2 but its model listing is still served under v1, same as
  // Anthropic's split versioning below.
  const endpoint = isAnthropic || isCohere ? `${url}/v1/models` : `${url}/models`;
  const response = await fetcher(endpoint, {method: 'GET', headers}, signal);
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
  if (isGemini) {
    const models = json.models || [];
    return models
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => String(m.name || '').replace(/^models\//, ''))
      .filter(Boolean)
      .sort();
  }
  if (isCohere) {
    const models = json.models || [];
    return models
      .filter(m => Array.isArray(m.endpoints) && m.endpoints.includes('chat'))
      .map(m => String(m.name || ''))
      .filter(Boolean)
      .sort();
  }
  const items = json.data || [];
  return items.map(m => m.id).filter(Boolean).sort();
}
