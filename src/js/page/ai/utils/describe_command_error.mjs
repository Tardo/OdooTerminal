// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// A failed run_command reaches the agent as a ProcessJobError whose generic ".message"
// ("Error executing 'search'") hides the real reason. The actual cause lives in '.data' —
// the original error (an Odoo RPCError with its own '.data.name/.message/.debug' for
// server-side failures, or a plain Error for JS-side ones). Walk it so the LLM sees the
// real server/business error instead of a placeholder, and can self-correct.
export default function describeCommandError(err: mixed): string {
  if (err === null || typeof err !== 'object') {
    return String(err);
  }
  // $FlowFixMe[prop-missing]
  const data = err.data;
  if (data !== null && typeof data === 'object') {
    const inner = typeof data.data === 'object' && data.data !== null ? data.data : data;
    const parts = [];
    if (inner.name !== null && inner.name !== undefined) parts.push(String(inner.name));
    if (inner.message !== null && inner.message !== undefined) parts.push(String(inner.message));
    if (inner.debug !== null && inner.debug !== undefined) parts.push(String(inner.debug));
    if (parts.length > 0) {
      return parts.join(': ');
    }
  } else if (typeof data === 'string' && data) {
    return data;
  }
  // $FlowFixMe[prop-missing]
  return typeof err.message === 'string' ? err.message : String(err);
}
