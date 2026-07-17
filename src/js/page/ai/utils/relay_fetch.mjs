// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import postMessage from '@common/utils/post_message';

// The AI providers run injected into the Odoo tab (MAIN world), so a direct fetch()
// there is subject to the target API's CORS policy (and the page's CSP). This module
// relays the request through the background service worker instead, which can bypass
// CORS for hosts covered by the extension's granted host permissions. See
// src/js/private/background.mjs and src/js/shared/content_script.mjs for the other
// ends of this relay.

type RelayFetchInit = {
  method: string,
  headers: {[string]: string},
  body?: string,
};

type RelayReadResult = {done: boolean, value?: ?Uint8Array};

type RelayReader = {
  getReader: () => {read: () => Promise<RelayReadResult>},
};

export type RelayFetchResponse = {
  ok: boolean,
  status: number,
  statusText: string,
  text: () => Promise<string>,
  body: ?RelayReader,
};

function genRequestId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function abortError(): Error {
  const err = new Error('The operation was aborted.');
  err.name = 'AbortError';
  return err;
}

function createRelayReader(): {reader: RelayReader, push: (string) => void, finish: () => void, fail: (Error) => void} {
  const encoder = new TextEncoder();
  const chunks: Array<string> = [];
  const pending: Array<{resolve: RelayReadResult => void, reject: Error => void}> = [];
  let done = false;
  let failure: ?Error = null;

  function read(): Promise<RelayReadResult> {
    if (failure !== null && failure !== undefined) {
      return Promise.reject(failure);
    }
    const chunk = chunks.shift();
    if (chunk !== undefined) {
      return Promise.resolve({done: false, value: encoder.encode(chunk)});
    }
    if (done) {
      return Promise.resolve({done: true});
    }
    return new Promise((resolve, reject) => {
      pending.push({resolve, reject});
    });
  }

  return {
    reader: {getReader: () => ({read})},
    push(chunk: string) {
      const waiter = pending.shift();
      if (waiter !== undefined) {
        waiter.resolve({done: false, value: encoder.encode(chunk)});
      } else {
        chunks.push(chunk);
      }
    },
    finish() {
      done = true;
      let waiter = pending.shift();
      while (waiter !== undefined) {
        waiter.resolve({done: true});
        waiter = pending.shift();
      }
    },
    fail(err: Error) {
      failure = err;
      let waiter = pending.shift();
      while (waiter !== undefined) {
        waiter.reject(err);
        waiter = pending.shift();
      }
    },
  };
}

function buildFetchError(code: mixed, url: mixed, error: mixed): Error {
  if (code === 'permission') {
    return new Error(
      i18n.t(
        'ai.utils.relayFetch.error.missingPermission',
        'Missing browser permission to contact {{url}}. Open the extension\'s Options page (AI Providers section) and use "Grant access" for this URL, then try again.',
        {url: String(url ?? '')},
      ),
    );
  }
  return new Error(String(error ?? i18n.t('ai.utils.relayFetch.error.unknown', 'AI request failed')));
}

/**
 * fetch()-compatible replacement that performs the actual network request from the
 * background service worker instead of the current (unprivileged) page context.
 */
export function backgroundFetch(url: string, init: RelayFetchInit, signal: AbortSignal): Promise<RelayFetchResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const requestId = genRequestId();
    const {reader, push, finish, fail} = createRelayReader();
    let settled = false;
    let resolveErrorText: ?(string) => void = null;
    const errorTextPromise: Promise<string> = new Promise(res => {
      resolveErrorText = res;
    });

    function cleanup() {
      window.removeEventListener('message', onMessage);
      signal.removeEventListener('abort', onAbort);
    }

    function onAbort() {
      postMessage('ODOO_TERM_AI_FETCH_ABORT', {requestId});
      if (!settled) {
        settled = true;
        cleanup();
        reject(abortError());
      } else {
        fail(abortError());
      }
    }

    function onMessage(ev: MessageEvent) {
      if (ev.source !== window || ev.data === null || typeof ev.data !== 'object') {
        return;
      }
      // $FlowFixMe[unclear-type]
      const data: Object = {...ev.data};
      if (data.requestId !== requestId) {
        return;
      }

      if (data.type === 'ODOO_TERM_AI_FETCH_HEADERS') {
        settled = true;
        resolve({
          ok: Boolean(data.ok),
          status: Number(data.status),
          statusText: String(data.statusText ?? ''),
          text: () => errorTextPromise,
          body: data.ok ? reader : null,
        });
      } else if (data.type === 'ODOO_TERM_AI_FETCH_ERROR_BODY') {
        // Terminal on the !ok path: headers already resolved with ok:false and no body,
        // so this is the last message for this request — resolve text() before cleaning up.
        resolveErrorText?.(String(data.text ?? ''));
        cleanup();
      } else if (data.type === 'ODOO_TERM_AI_FETCH_CHUNK') {
        push(String(data.chunk ?? ''));
      } else if (data.type === 'ODOO_TERM_AI_FETCH_DONE') {
        finish();
        cleanup();
      } else if (data.type === 'ODOO_TERM_AI_FETCH_ABORTED') {
        const err = abortError();
        cleanup();
        if (!settled) {
          settled = true;
          reject(err);
        } else {
          fail(err);
        }
      } else if (data.type === 'ODOO_TERM_AI_FETCH_ERROR') {
        const err = buildFetchError(data.code, data.url, data.error);
        cleanup();
        if (!settled) {
          settled = true;
          reject(err);
        } else {
          fail(err);
        }
      }
    }

    window.addEventListener('message', onMessage, false);
    signal.addEventListener('abort', onAbort);

    postMessage('ODOO_TERM_AI_FETCH_START', {
      requestId,
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
  });
}

/**
 * Checks (via the background service worker) whether the extension currently holds
 * host permission to contact the given URL without hitting CORS.
 */
export function checkHostPermission(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const requestId = genRequestId();

    function onMessage(ev: MessageEvent) {
      if (ev.source !== window || ev.data === null || typeof ev.data !== 'object') {
        return;
      }
      // $FlowFixMe[unclear-type]
      const data: Object = {...ev.data};
      if (data.type === 'ODOO_TERM_AI_PERMISSION_RESULT' && data.requestId === requestId) {
        window.removeEventListener('message', onMessage);
        resolve(Boolean(data.granted));
      }
    }

    window.addEventListener('message', onMessage, false);
    postMessage('ODOO_TERM_AI_CHECK_PERMISSION', {requestId, url});
  });
}
