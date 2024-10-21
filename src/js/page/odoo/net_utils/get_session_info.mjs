// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import cachedCallModelMulti from './cached_call_model_multi';

export default function (): Promise<OdooSessionInfo | void> {
  return cachedCallModelMulti<OdooSessionInfo>(
    'ir_http.session_info',
    'ir.http',
    [0],
    'session_info'
  );
}
