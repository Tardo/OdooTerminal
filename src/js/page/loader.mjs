// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import OdooTerminal from "./odoo/terminal.mjs";
import OdooTerminalTests from "./tests/terminal.mjs";
import {registerCoreFuncs} from "./terminal/funcs.mjs";
import {registerCommonFuncs} from "./odoo/funcs/common.mjs";
import {registerBackendFuncs} from "./odoo/funcs/backend.mjs";
import {getOdooVersion, getUsername, isBackOffice} from "./odoo/utils.mjs";

let terminal = null;
function getTerminalObj() {
  if (terminal) {
    return terminal;
  }

  const load_tests = window.__OdooTerminal.load_tests || navigator.webdriver;
  if (load_tests) {
    console.info("[OdooTerminal] Tests Enabled"); // eslint-disable-line no-console
  }
  try {
    const TerminalClass = load_tests ? OdooTerminalTests : OdooTerminal;
    terminal = new TerminalClass();
    registerCoreFuncs(terminal);
    registerCommonFuncs(terminal);
  } catch (err) {
    console.warn("[OdooTerminal] Can't initilize terminal", err);
  }
  return terminal;
}

window.addEventListener("toggle_terminal", () => {
  OdooTerminal.doToggle();
});
window.addEventListener(
  "message",
  (ev) => {
    if (ev.source !== window) {
      return;
    }
    if (ev.data.type === "ODOO_TERM_CONFIG") {
      window.__OdooTerminal = {
        raw_server_info: ev.data.info,
        load_tests: ev.data.config.devmode_tests,
      };
      const term_obj = getTerminalObj();
      if (term_obj) {
        if (isBackOffice()) {
          registerBackendFuncs(term_obj);
        }
        term_obj.init(ev.data.config);
        const vals = {
          version: getOdooVersion(),
        };
        const username = getUsername();
        if (username) {
          vals.username = username;
        }
        term_obj.screen.updateInputInfo(vals);
      }
    }
  },
  true
);
// This is used to communicate to the extension that the widget
// is initialized successfully.
window.postMessage(
  {
    type: "ODOO_TERM_START",
  },
  "*"
);
