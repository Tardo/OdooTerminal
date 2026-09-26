// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {formatHTTPError} from './network';
import type {RelayFetchResponse} from './relay_fetch';

// Keep incomplete lines (including split UTF-8 characters) until the next chunk.
export default async function* streamLines(response: RelayFetchResponse): AsyncGenerator<string, void, void> {
  if (!response.ok) {
    throw new Error(formatHTTPError(response.status, await response.text()));
  }
  if (!response.body) {
    throw new Error(i18n.t('ai.utils.network.error.noStream', 'Server did not return a streaming response'));
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const {done, value} = await reader.read();
    buffer += done ? decoder.decode() : decoder.decode(value ?? new Uint8Array(0), {stream: true});
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      yield line.trim();
    }
    if (done) {
      if (buffer) yield buffer.trim();
      return;
    }
  }
}
