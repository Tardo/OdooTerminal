// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {getOdooService, getOdooVersionMajor} from "@odoo/utils";

const OdooRoot = getOdooService("root.widget", "web.web_client");

export function doAction(action, options) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer >= 15) {
    OdooRoot.env.bus.trigger("do-action", {
      action: action,
      options: options,
    });

    // Simulate action completion time..
    // FIXME: this makes me cry
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({id: action});
      }, 450);
    });
  }

  return new Promise(function (resolve, reject) {
    OdooRoot.trigger_up("do_action", {
      action: action,
      options: options,
      on_success: resolve,
      on_fail: reject,
    });
  });
}

export function doCall(service, method) {
  const OdooVer = getOdooVersionMajor();
  var args = Array.prototype.slice.call(arguments, 2);
  var result = null;
  const trigger =
    OdooVer >= 15 ? OdooRoot.env.bus.trigger : OdooRoot.trigger_up;
  trigger.bind(OdooRoot)("call_service", {
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
  OdooRoot.env.bus.trigger("show-effect", payload);
}

export function executeAction(payload) {
  const OdooVer = getOdooVersionMajor();
  if (OdooVer < 15) {
    return;
  }
  OdooRoot.env.bus.trigger("execute-action", payload);
}

export default OdooRoot;
