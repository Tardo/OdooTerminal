// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import {backgroundFetch} from '@ai/utils/relay_fetch';
import type {RelayFetchResponse} from '@ai/utils/relay_fetch';

// Minimal client for the MCP "Streamable HTTP" transport (protocol 2025-06-18), reusing
// the same page->background fetch relay already used for AI provider calls (bypasses the
// page's CORS wall for hosts covered by a granted host permission — see relay_fetch.mjs).
//
// Verified against a live @modelcontextprotocol/sdk reference server:
// - Both "application/json" and "text/event-stream" MUST be accepted, or the server replies 406.
// - "initialize" returns an "Mcp-Session-Id" response header that must be echoed on every
//   later request for that session.
// - Responses arrive either as a direct JSON-RPC body or as a single SSE event whose "data:"
//   line holds the same JSON-RPC payload.
// - "notifications/initialized" is a notification (no id): the server replies 202 with an
//   empty body and no session header — that must not be treated as "session lost".
// - A missing/invalid session comes back as HTTP 400 with a top-level JSON-RPC error.
// - Tool-level failures (unknown tool, bad arguments) arrive as HTTP 200 with result.isError.

const PROTOCOL_VERSION = '2025-06-18';
const MCP_ACCEPT = 'application/json, text/event-stream';
const MAX_TOOL_NAME_LENGTH = 64;

const sessions: Map<string, ?string> = new Map();

let requestCounter = 0;
function nextId(): number {
  requestCounter += 1;
  return requestCounter;
}

export function slugifyServerName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'server';
}

export function buildMCPToolName(serverSlug: string, toolName: string): string {
  const safeToolName = toolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const full = `mcp__${serverSlug}__${safeToolName}`;
  return full.length > MAX_TOOL_NAME_LENGTH ? full.slice(0, MAX_TOOL_NAME_LENGTH) : full;
}

function buildHeaders(server: MCPServerConfig, sessionId: ?string): {[string]: string} {
  const headers: {[string]: string} = {
    'Content-Type': 'application/json',
    Accept: MCP_ACCEPT,
  };
  if (server.api_key) {
    headers.Authorization = `Bearer ${server.api_key}`;
  }
  if (sessionId !== null && sessionId !== undefined) {
    headers['Mcp-Session-Id'] = sessionId;
  }
  return headers;
}

async function readFullText(response: RelayFetchResponse): Promise<string> {
  if (!response.body) {
    return '';
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const {done, value} = await reader.read();
    if (done) {
      break;
    }
    text += decoder.decode(value !== null && value !== undefined ? value : new Uint8Array(0), {stream: true});
  }
  return text;
}

function parseJSONRPCBody(raw: string, contentType: string): mixed {
  if (!raw) {
    return null;
  }
  if (contentType.includes('text/event-stream')) {
    const frames = raw.split(/\r?\n\r?\n/);
    for (const frame of frames) {
      const dataLines = frame.split(/\r?\n/).filter(line => line.startsWith('data:'));
      if (dataLines.length === 0) {
        continue;
      }
      try {
        return JSON.parse(dataLines.map(line => line.slice(5).trim()).join('\n'));
      } catch (_) {
        // keep looking at the next frame
      }
    }
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

type MCPRPCResult = {result: mixed, sessionId: ?string};

async function sendJSONRPC(
  server: MCPServerConfig,
  method: string,
  params: mixed,
  id: ?number,
  sessionId: ?string,
  signal: AbortSignal,
): Promise<MCPRPCResult> {
  const headers = buildHeaders(server, sessionId);
  const payload: {[string]: mixed} = {jsonrpc: '2.0', method, params};
  if (id !== null && id !== undefined) {
    payload.id = id;
  }
  const response = await backgroundFetch(server.url, {method: 'POST', headers, body: JSON.stringify(payload)}, signal);
  const newSessionId = response.headers['mcp-session-id'] ?? sessionId;

  if (!response.ok) {
    const errorText = await response.text();
    const parsedErr = parseJSONRPCBody(errorText, response.headers['content-type'] ?? '');
    const message =
      parsedErr !== null &&
      typeof parsedErr === 'object' &&
      parsedErr.error !== null &&
      parsedErr.error !== undefined &&
      typeof parsedErr.error.message === 'string'
        ? parsedErr.error.message
        : errorText || `HTTP ${response.status}`;
    const err = new Error(message);
    // $FlowFixMe[prop-missing]
    err.httpStatus = response.status;
    throw err;
  }

  // Notifications get a 202 with an empty body — nothing to parse.
  if (id === null || id === undefined) {
    return {result: null, sessionId: newSessionId};
  }

  const raw = await readFullText(response);
  const parsed = parseJSONRPCBody(raw, response.headers['content-type'] ?? '');
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error(i18n.t('ai.mcp.error.badResponse', 'MCP server returned an unparsable response'));
  }
  if (parsed.error !== undefined && parsed.error !== null) {
    const message = typeof parsed.error.message === 'string' ? parsed.error.message : JSON.stringify(parsed.error);
    throw new Error(message);
  }
  return {result: parsed.result ?? null, sessionId: newSessionId};
}

async function ensureSession(server: MCPServerConfig, signal: AbortSignal): Promise<?string> {
  if (sessions.has(server.url)) {
    return sessions.get(server.url);
  }
  const init = await sendJSONRPC(
    server,
    'initialize',
    {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {name: 'OdooTerminal', version: '1.0'},
    },
    nextId(),
    null,
    signal,
  );
  const sessionId = init.sessionId ?? null;
  sessions.set(server.url, sessionId);
  if (sessionId !== null) {
    await sendJSONRPC(server, 'notifications/initialized', {}, null, sessionId, signal);
  }
  return sessionId;
}

// Shared stale-session recovery: the cached session id (module-level, keyed by server URL, so
// it outlives a single agent run) can go stale between runs if the server expires/restarts it.
// Any request using it fails with 400/404 (verified against a live reference server) — on that,
// drop the cache and retry once with a freshly negotiated session, whether this is a discovery
// call (listMCPTools) or an actual tool invocation (callMCPTool).
async function withSession<T>(
  server: MCPServerConfig,
  signal: AbortSignal,
  fn: (sessionId: ?string) => Promise<T>,
): Promise<T> {
  const sessionId = await ensureSession(server, signal);
  try {
    return await fn(sessionId);
  } catch (err) {
    // $FlowFixMe[prop-missing]
    const status: mixed = err.httpStatus;
    if (status !== 400 && status !== 404) {
      throw err;
    }
    sessions.delete(server.url);
    const freshSessionId = await ensureSession(server, signal);
    return await fn(freshSessionId);
  }
}

function extractTextFromContent(content: mixed): string {
  if (!Array.isArray(content)) {
    return '';
  }
  const parts: Array<string> = [];
  for (const block of content) {
    if (block === null || typeof block !== 'object') {
      continue;
    }
    // $FlowFixMe[prop-missing]
    const blockType = block.type;
    // $FlowFixMe[prop-missing]
    const blockText = block.text;
    if (blockType === 'text' && typeof blockText === 'string') {
      parts.push(blockText);
    }
  }
  return parts.join('\n');
}

function toToolInfo(raw: mixed): ?MCPToolInfo {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }
  const name = typeof raw.name === 'string' ? raw.name : '';
  if (!name) {
    return null;
  }
  return {
    name,
    description: typeof raw.description === 'string' ? raw.description : '',
    inputSchema:
      raw.inputSchema !== null && typeof raw.inputSchema === 'object'
        // $FlowFixMe[incompatible-variance]
        ? raw.inputSchema
        : {type: 'object', properties: {}},
  };
}

export async function listMCPTools(server: MCPServerConfig, signal: AbortSignal): Promise<Array<MCPToolInfo>> {
  return withSession(server, signal, async sessionId => {
    const {result} = await sendJSONRPC(server, 'tools/list', {}, nextId(), sessionId, signal);
    const rawTools = result !== null && typeof result === 'object' && Array.isArray(result.tools) ? result.tools : [];
    return rawTools.map(toToolInfo).filter(Boolean);
  });
}

async function doCallMCPTool(
  server: MCPServerConfig,
  toolName: string,
  args: {[string]: mixed},
  sessionId: ?string,
  signal: AbortSignal,
): Promise<{text: string, isError: boolean}> {
  const {result} = await sendJSONRPC(server, 'tools/call', {name: toolName, arguments: args}, nextId(), sessionId, signal);
  if (result === null || typeof result !== 'object') {
    return {text: '', isError: true};
  }
  const text = extractTextFromContent(result.content);
  const isError = Boolean(result.isError);
  return {text: text || (isError ? i18n.t('ai.mcp.error.toolFailedNoMessage', 'Tool returned an error with no message') : ''), isError};
}

export async function callMCPTool(
  server: MCPServerConfig,
  toolName: string,
  args: {[string]: mixed},
  signal: AbortSignal,
): Promise<{text: string, isError: boolean}> {
  return withSession(server, signal, sessionId => doCallMCPTool(server, toolName, args, sessionId, signal));
}
