// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import callModelMulti from '@odoo/osv/call_model_multi';

let sessionInfo: Promise<OdooSessionInfo | void> | void;

export default function (): Promise<OdooSessionInfo | void> {
  if (!sessionInfo) {
    sessionInfo = callModelMulti<OdooSessionInfo>('ir.http', [], 'session_info').catch(() => {
      sessionInfo = undefined;
    });
  }
  return sessionInfo;
}
