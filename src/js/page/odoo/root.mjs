// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import asyncSleep from '@terminal/utils/async_sleep';
import getOdooService from './utils/get_odoo_service';
import getOdooVersionMajor from './utils/get_odoo_version_major';

const defSymbol = Symbol.for('default');
export default function OdooRoot() {
  let root = getOdooService('root.widget', 'web.web_client');
  if (root) {
    return root;
  }
  root = getOdooService('@web/legacy/js/env');
  if (root) {
    return {
      env: root[defSymbol],
    };
  }
}

export async function doAction(action, options) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    OdooRoot().env.bus.trigger('do-action', {
      action: action,
      options: options,
    });
    // Simulate end of the 'action'
    // FIXME: This makes me cry
    await asyncSleep(1800);
    return {id: action};
  }

  return new Promise((resolve, reject) => {
    OdooRoot().trigger_up('do_action', {
      action: action,
      options: options,
      on_success: resolve,
      on_fail: reject,
    });
  });
}

export function doCall(service, method) {
  const OdooVer = getOdooVersionMajor();
  const args = Array.prototype.slice.call(arguments, 2);
  let result = null;
  const trigger =
    OdooVer >= 15 ? OdooRoot().env.bus.trigger : OdooRoot().trigger_up;
  trigger.bind(OdooRoot())('call_service', {
    service: service,
    method: method,
    args: args,
    callback: function (r) {
      result = r;
    },
  });
  return result;
}

export function showEffect(type, options) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer < 15) {
    return;
  }
  const payload = Object.assign({}, options, {type: type});
  OdooRoot().env.bus.trigger('show-effect', payload);
}

export function executeAction(payload) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer < 15) {
    return;
  }
  OdooRoot().env.bus.trigger('execute-action', payload);
}
