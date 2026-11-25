// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

// The content script runs on every http(s) page and can't tell the terminal's messages from the
// page's own ones, so nothing sent by the page is trusted: API keys never leave the extension
// (the page gets opaque references) and privileged operations are limited to user-approved sites.

const REF_PREFIX = '@odoo-terminal-key';
const REF_RE = /@odoo-terminal-key:(ai|mcp):(\S+)$/;

type Endpoint = {+name: string, +url: string, +api_key: string, ...};
type Settings = {+ai_models?: mixed, +mcp_servers?: mixed, +trusted_origins?: mixed, ...};

export const POLICY_SETTINGS: $ReadOnlyArray<string> = ['ai_models', 'mcp_servers', 'trusted_origins'];

// $FlowFixMe[unclear-type]
function asArray(value: any): Array<Endpoint> {
  return Array.isArray(value) ? value : [];
}

export function toOrigin(url: mixed): ?string {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : null;
  } catch (_) {
    return null;
  }
}

export function isTrustedOrigin(url: mixed, settings: Settings): boolean {
  const origin = toOrigin(url);
  const {trusted_origins} = settings;
  return origin !== null && origin !== undefined && Array.isArray(trusted_origins) && trusted_origins.includes(origin);
}

// $FlowFixMe[unclear-type]
export function redactSettings(settings: Object): Object {
  const redact = (kind: string, entries: mixed) =>
    asArray(entries).map(item => ({
      ...item,
      api_key: item.api_key ? `${REF_PREFIX}:${kind}:${encodeURIComponent(item.name)}` : '',
    }));
  return {
    ...settings,
    ai_models: redact('ai', settings.ai_models),
    mcp_servers: redact('mcp', settings.mcp_servers),
    // Would reveal the user's other Odoo sites
    trusted_origins: [],
  };
}

function isUnderEndpoint(url: string, endpoint: string): boolean {
  try {
    const target = new URL(url);
    const base = new URL(endpoint);
    const path = base.pathname.replace(/\/+$/, '');
    return (
      target.origin === base.origin &&
      target.username === '' &&
      (target.pathname === base.pathname || target.pathname === path || target.pathname.startsWith(`${path}/`))
    );
  } catch (_) {
    return false;
  }
}

/**
 * Returns the headers with the real API keys, or null when the request doesn't target a
 * configured endpoint.
 */
export function resolveHeaders(url: string, headers: ?{+[string]: mixed}, settings: Settings): {[string]: string} | null {
  const entries: {[string]: Array<Endpoint>} = {
    ai: asArray(settings.ai_models).filter(item => isUnderEndpoint(url, item.url)),
    mcp: asArray(settings.mcp_servers).filter(item => isUnderEndpoint(url, item.url)),
  };
  if (entries.ai.length + entries.mcp.length === 0) {
    return null;
  }
  const resolved: {[string]: string} = {};
  for (const [name, raw] of Object.entries(headers ?? {})) {
    const value = String(raw);
    const match = REF_RE.exec(value);
    if (!match) {
      resolved[name] = value;
      continue;
    }
    const entry = entries[match[1]].find(item => encodeURIComponent(item.name) === match[2]);
    if (!entry) {
      return null;
    }
    resolved[name] = value.slice(0, match.index) + entry.api_key;
  }
  return resolved;
}
