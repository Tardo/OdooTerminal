// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import '@css/terminal.css';
import i18n from 'i18next';
import HttpApi from 'i18next-http-backend';
import postMessage from '@common/utils/post_message';
import registerBackofficeFuncs from '@odoo/commands/backoffice/__all__';
import registerCommonFuncs from '@odoo/commands/common/__all__';
import OdooTerminal from '@odoo/terminal';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getUID from '@odoo/utils/get_uid';
import getUsername from '@odoo/utils/get_username';
import isBackOffice from '@odoo/utils/is_backoffice';
import registerCoreFuncs from '@terminal/commands/__all__';
import OdooTerminalTests from '@tests/terminal';

let terminal = null;
function getTerminalObj() {
  if (terminal) {
    return terminal;
  }

  const load_tests = window.__OdooTerminal?.load_tests || navigator.webdriver;
  if (load_tests) {
    console.info('[OdooTerminal] Tests Enabled');
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

function initTerminal(config, info) {
  window.__OdooTerminal = {
    raw_server_info: info,
    load_tests: config.devmode_tests,
  };
  const term_obj = getTerminalObj();
  if (term_obj) {
    if (isBackOffice()) {
      registerBackofficeFuncs(term_obj);
    }
    term_obj.init(config);
    const vals = {
      version: getOdooVersion(),
    };
    const username = getUsername();
    const uid = getUID();
    if (uid && uid !== -1) {
      vals.username = username ? username : `uid: ${uid}`;
    }
    term_obj.screen.updateInputInfo(vals);
  }
}

function initTranslations(langpath) {
  return i18n.use(HttpApi).init({
    lng: navigator.language.replace('-', '_'),
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    load: ['currentOnly', 'languageOnly'],
    debug: false,
    backend: {
      loadPath: langpath,
    },
  });
}

function onToggleTerminal() {
  if (typeof window.__OdooTerminal !== 'undefined') {
    getTerminalObj().doToggle();
  }
}

function onWindowMessage(ev) {
  if (ev.source !== window) {
    return;
  }

  if (ev.data.type === 'ODOO_TERM_CONFIG') {
    initTranslations(ev.data.langpath).then(() =>
      initTerminal(ev.data.config, ev.data.info),
    );
  }
}

window.addEventListener('toggle_terminal', onToggleTerminal);
window.addEventListener('message', onWindowMessage, true);
// This is used to communicate to the extension that the widget
// was initialized successfully.
postMessage('ODOO_TERM_START');
