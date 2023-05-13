// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {ubrowser} from "../globals.mjs";

export const InstanceContext = {
  isOdoo: false,
  isLoaded: false,
  serverVersionRaw: null,
  isCompatible: false,
  isBackOffice: false,
  serverVersion: {
    major: 0,
    minor: 0,
  },
};

/**
 * Update the instance context and update the action badge
 * @param  {...any} values
 */
export function updateContext(...values) {
  Object.assign(InstanceContext, ...values);
  ubrowser.runtime.sendMessage({
    message: "update_terminal_badge_info",
    context: InstanceContext,
  });
}

/**
 * Get necessary resources to initialize the terminal
 * @returns {Array}
 */
export function getResources() {
  const to_inject = {
    css: [],
    js: ["globals.js"],
  };
  // Compatibility resources
  // 11 - v11
  // 12+ - v12
  // 15+ - v15
  let compat_mode = null;
  const odoo_version = InstanceContext.serverVersion;
  if (odoo_version.major === 11 && odoo_version.minor === 0) {
    // Version 11.0
    to_inject.js.push("odoo/js/core/compat/v11/common.js");
    compat_mode = 11;
  }
  if (
    (odoo_version.major === 11 && odoo_version.minor > 0) ||
    odoo_version.major >= 12
  ) {
    // Version 12.0
    to_inject.js.push("odoo/js/core/compat/v12/common.js");
    compat_mode = 12;
  }
  if (
    (odoo_version.major === 14 && odoo_version.minor > 0) ||
    odoo_version.major >= 15
  ) {
    // Version 15.0
    to_inject.js.push("odoo/js/core/compat/v15/common.js");
    if (InstanceContext.isBackOffice) {
      to_inject.js.push("odoo/js/core/compat/v15/backend.js");
    }
    compat_mode = 15;
  }
  if (
    (odoo_version.major === 15 && odoo_version.minor > 0) ||
    odoo_version.major >= 16
  ) {
    // Version 16.0
    to_inject.js.push("odoo/js/core/compat/v16/common.js");
    if (InstanceContext.isBackOffice) {
      to_inject.js.push("odoo/js/core/compat/v16/backend.js");
    }
    compat_mode = 16;
  }
  // Backend/Frontend resources
  if (InstanceContext.isBackOffice) {
    let backend_loader = "";
    if (compat_mode >= 15) {
      backend_loader = "_owl_legacy";
    }
    to_inject.js = to_inject.js.concat([
      "odoo/js/core/utils_backend.js",
      "odoo/js/functions/backend.js",
      "odoo/js/functions/fuzz.js",
      `odoo/js/loaders/backend${backend_loader}.js`,
    ]);
  } else {
    to_inject.js.push(`odoo/js/loaders/frontend.js`);
  }
  // Common resources
  to_inject.css = to_inject.css.concat(["odoo/css/terminal.css"]);
  to_inject.js = to_inject.js.concat([
    "odoo/js/core/rpc.js",
    "odoo/js/core/utils.js",
    "odoo/js/core/recordset.js",
    "odoo/js/core/abstract/longpolling.js",
    "odoo/js/core/abstract/screen.js",
    "odoo/js/core/storage.js",
    "odoo/js/core/template_manager.js",
    "odoo/js/core/command_assistant.js",
    "odoo/js/core/screen.js",
    "odoo/js/core/longpolling.js",
    "odoo/js/core/trash/const.js",
    "odoo/js/core/trash/exception.js",
    "odoo/js/core/trash/interpreter.js",
    "odoo/js/core/trash/vmachine.js",
    "odoo/js/core/parameter_generator.js",
    "odoo/js/tests/tests.js",
    "odoo/js/tests/test_core.js",
    "odoo/js/tests/test_common.js",
    "odoo/js/tests/test_backend.js",
    "odoo/js/tests/test_trash.js",
    "odoo/js/terminal.js",
    "odoo/js/functions/core.js",
    "odoo/js/functions/common.js",
  ]);
  return to_inject;
}
