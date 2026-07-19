// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import listModels from '@common/utils/ai_models_protocol';
import type {ModelsFetchResponse} from '@common/utils/ai_models_protocol';

// The Options page is a regular extension page (chrome-extension:// origin), not code injected
// into the Odoo tab — it isn't subject to that tab's CORS/CSP, so unlike @ai/utils/list_models
// it can call fetch() directly instead of relaying through the background service worker.
async function fetcher(
  url: string,
  init: {method: string, headers: {[string]: string}},
  signal: AbortSignal,
): Promise<ModelsFetchResponse> {
  const response = await fetch(url, {...init, signal});
  return {ok: response.ok, status: response.status, body: response.body};
}

export default function (url: string, apiKey: ?string, provider: ?string, signal: AbortSignal): Promise<Array<string>> {
  return listModels(url, apiKey, provider, signal, fetcher);
}
