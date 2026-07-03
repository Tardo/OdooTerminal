// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import type {CMDCallbackContext} from '@trash/interpreter';


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

function extractErrorMessage(errorText: string): ?{message: string, code: mixed} {
  let parsed: mixed = null;
  try {
    parsed = JSON.parse(errorText);
  } catch (_) {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }
  // $FlowFixMe[prop-missing]
  const errObj: mixed = parsed.error !== undefined ? parsed.error : parsed;
  if (errObj === null || typeof errObj !== 'object') {
    return null;
  }
  // $FlowFixMe[prop-missing]
  const message: mixed = errObj.message;
  if (typeof message !== 'string') {
    return null;
  }
  // $FlowFixMe[prop-missing]
  const code: mixed = errObj.status ?? errObj.code ?? errObj.type;
  return {message, code};
}

// Providers (OpenAI, Anthropic, Gemini) all wrap error details in a JSON body, but the raw
// dump is a wall of boilerplate (doc links, quota violation objects, retry-info records) that
// buries the one line a human actually needs. Pull just the message + a short error code out
// of the common `{error: {message, ...}}` shape and fall back to the raw body when it doesn't
// parse as JSON.
export function formatHTTPError(status: number, errorText: string): string {
  const header = i18n.t('ai.utils.network.error.httpError', 'HTTP error {{status}}', {status});

  const extracted = extractErrorMessage(errorText);
  if (extracted !== null && extracted !== undefined) {
    const {message, code} = extracted;
    const codeSuffix = code !== null && code !== undefined && String(code) !== String(status) ? ` (${String(code)})` : '';
    return `${header}${codeSuffix}: ${message}`;
  }

  return `${header}\n${errorText}`;
}
