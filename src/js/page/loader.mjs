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
import getOdooService from '@odoo/utils/get_odoo_service';
import getUID from '@odoo/utils/get_uid';
import getUsername from '@odoo/utils/get_username';
import isBackOffice from '@odoo/utils/is_backoffice';
import registerMathFuncs from '@trash/libs/math/__all__';
import registerTimeFuncs from '@trash/libs/time/__all__';
import registerNetFuncs from '@trash/libs/net/__all__';
import registerCoreFuncs from '@terminal/commands/__all__';
import registerGraphicsFuncs from '@terminal/libs/graphics/__all__';
import OdooTerminalTests from '@tests/terminal';
import type {TerminalOptions} from '@terminal/terminal';
import type {InputInfo} from '@terminal/core/screen';
import type VMachine from '@trash/vmachine';

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

  // $FlowIgnore: 'webdriver' is used by automated browsers
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

async function postInitTerminal(term_obj: OdooTerminal, config: TerminalOptions) {
  let odoo_ver = getOdooVersion();
  if (typeof odoo_ver !== 'string') {
    odoo_ver = 'unknown';
  }
  const vals: Partial<InputInfo> = {
    version: odoo_ver,
  };
  const username = await getUsername(config.elephant);
  const uid = getUID();
  if (uid && uid !== -1) {
    vals.username = username ? username : `uid: ${uid}`;
  }
  term_obj.screen.updateInputInfo(vals);
}

function loadVMFunctions(vm: VMachine) {
  registerCoreFuncs(vm);
  registerMathFuncs(vm);
  registerNetFuncs(vm);
  registerTimeFuncs(vm);
  registerGraphicsFuncs(vm);
  registerCommonFuncs(vm);
  if (isBackOffice()) {
    registerBackofficeFuncs(vm);
  }
}

async function initTerminal(config: TerminalOptions, info: {[string]: mixed}) {
  window.__OdooTerminal = {
    raw_server_info: info,
    load_tests: config.devmode_tests,
  };
  const term_obj = getTerminalObj();
  if (term_obj) {
    loadVMFunctions(term_obj.getShell().getVM());
    let lazy_loader_obj = getOdooService("@web/legacy/js/public/lazyloader");
    if (typeof lazy_loader_obj !== 'undefined') {
      // Caching call: see command implementation for more details.
      getUID();
      lazy_loader_obj = lazy_loader_obj[Symbol.for('default')];
      await lazy_loader_obj.allScriptsLoaded;
    }
    term_obj.init(config);
    await postInitTerminal(term_obj, config);
  }
}

function initTranslations(langpath: string, lang: string) {
  const lang_s = lang === 'auto' ? navigator.language.replace('-', '_') : lang;
  return i18n.use(HttpApi).init({
    lng: lang_s,
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
      initTranslations(ev.data.langpath, ev.data.config.language).then(() => initTerminal(ev.data.config, ev.data.info));
    }
  }
}

window.addEventListener('toggle_terminal', onToggleTerminal);
window.addEventListener('message', onWindowMessage, true);
// This is used to communicate to the extension that the widget
// was initialized successfully.
postMessage('ODOO_TERM_START', {});
