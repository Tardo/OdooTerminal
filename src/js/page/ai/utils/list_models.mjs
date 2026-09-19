// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import listModels from '@common/utils/ai_models_protocol';
import {backgroundFetch} from '@ai/utils/relay_fetch';
import type {ModelsFetchResponse} from '@common/utils/ai_models_protocol';

async function fetcher(
  url: string,
  init: {method: string, headers: {[string]: string}},
  signal: AbortSignal,
): Promise<ModelsFetchResponse> {
  const response = await backgroundFetch(url, {method: init.method, headers: init.headers}, signal);
  return {ok: response.ok, status: response.status, body: response.body};
}

/**
 * Lists the available model ids for a provider connection, via the background
 * relay (see relay_fetch.mjs) so the request isn't subject to the page's CORS
 * restrictions.
 */
export default function (url: string, apiKey: ?string, provider: ?string, signal: AbortSignal): Promise<Array<string>> {
  return listModels(url, apiKey, provider, signal, fetcher);
}
