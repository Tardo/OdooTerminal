// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import '@css/terminal.css';
// $FlowIgnore
import i18n from 'i18next';
// $FlowIgnore
import HttpApi from 'i18next-http-backend';
import postMessage from '@common/utils/post_message';
import logger from '@common/logger';
import registerBackofficeFuncs from '@odoo/commands/backoffice/__all__';
import registerCommonFuncs from '@odoo/commands/common/__all__';
import OdooTerminal from '@odoo/terminal';
import getOdooVersion from '@odoo/utils/get_odoo_version';
import getUID from '@odoo/utils/get_uid';
import getUsername from '@odoo/utils/get_username';
import isBackOffice from '@odoo/utils/is_backoffice';
import registerCoreFuncs from '@terminal/commands/__all__';
import registerMathFuncs from '@terminal/libs/math/__all__';
import registerGraphicsFuncs from '@terminal/libs/graphics/__all__';
import OdooTerminalTests from '@tests/terminal';
import type {TerminalOptions} from '@terminal/terminal';
import type {InputInfo} from '@terminal/core/screen';

export type LoaderConfig = {
  config: {[string]: mixed},
  info: {[string]: mixed},
  langpath: string,
};

let terminal;
function getTerminalObj(): OdooTerminal | void {
  if (terminal) {
    return terminal;
  }

  // $FlowIgnore: 'webdriver' is used by selenium
  const load_tests = window.__OdooTerminal?.load_tests || navigator.webdriver;
  if (load_tests) {
    logger.info('loader', i18n.t('loader.testsEnabled', 'Tests Enabled'));
  }
  try {
    const TerminalClass = load_tests ? OdooTerminalTests : OdooTerminal;
    terminal = new TerminalClass();
  } catch (err) {
    logger.warn('loader', i18n.t('loader.cantInitTerm', "Can't initilize terminal"), err);
  }
  return terminal;
}

function initTerminal(config: TerminalOptions, info: {[string]: mixed}) {
  window.__OdooTerminal = {
    raw_server_info: info,
    load_tests: config.devmode_tests,
  };
  const term_obj = getTerminalObj();
  if (term_obj) {
    registerCoreFuncs(term_obj.getShell().getVM());
    registerMathFuncs(term_obj.getShell().getVM());
    registerGraphicsFuncs(term_obj.getShell().getVM());
    registerCommonFuncs(term_obj.getShell().getVM());
    if (isBackOffice()) {
      registerBackofficeFuncs(term_obj.getShell().getVM());
    }
    term_obj.init(config);
    let odoo_ver = getOdooVersion();
    if (typeof odoo_ver !== 'string') {
      odoo_ver = 'unknown';
    }
    const vals: Partial<InputInfo> = {
      version: odoo_ver,
    };
    const username = getUsername();
    const uid = getUID();
    if (uid && uid !== -1) {
      vals.username = username ? username : `uid: ${uid}`;
    }
    term_obj.screen.updateInputInfo(vals);
  }
}

function initTranslations(langpath: string) {
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
    getTerminalObj()?.doToggle();
  }
}

function onWindowMessage(ev: MessageEvent) {
  if (ev.source !== window) {
    return;
  }

  if (ev.data !== null && typeof ev.data === 'object') {
    if (ev.data.type === 'ODOO_TERM_CONFIG') {
      // $FlowFixMe
      initTranslations(ev.data.langpath).then(() => initTerminal(ev.data.config, ev.data.info));
    }
  }
}

window.addEventListener('toggle_terminal', onToggleTerminal);
window.addEventListener('message', onWindowMessage, true);
// This is used to communicate to the extension that the widget
// was initialized successfully.
postMessage('ODOO_TERM_START', {});
