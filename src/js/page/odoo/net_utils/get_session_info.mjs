// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import cachedCallModelMulti from './cached_call_model_multi';

export default function (): Promise<OdooSessionInfo | void> {
  return cachedCallModelMulti<OdooSessionInfo>(
    'ir_http.session_info',
    'ir.http',
    [0],
    'session_info'
  );
}
