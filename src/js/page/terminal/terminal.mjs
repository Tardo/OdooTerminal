// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';
import logger from '@common/logger';
import processKeybind from '@common/utils/process_keybind';
import {SETTING_DEFAULTS} from '@common/constants';
import Shell from './shell';
import ElementNotFoundError from './exceptions/element_not_found_error';
import UnknownCommandError from '@trash/exceptions/unknown_command_error';
import InvalidCommandDefintionError from '@trash/exceptions/invalid_command_definition_error';
import isEmpty from '@trash/utils/is_empty';
import CommandAssistant from './core/command_assistant';
import Screen from './core/screen';
import {getStorageItem as getStorageLocalItem, setStorageItem as setStorageLocalItem, removeStorageItem as removeStorageLocalItem} from './core/storage/local';
import {
  getStorageItem as getStorageSessionItem,
  removeStorageItem as removeStorageSessionItem,
  setStorageItem as setStorageSessionItem,
} from './core/storage/session';
import renderTerminal from './templates/terminal';
import renderAIConvItem from './templates/ai_conv_item';
import renderBusyTooltip from './templates/busy_tooltip';
import renderWelcome from './templates/welcome';
import debounce from './utils/debounce';
import keyCode from './utils/keycode';
import parseHTML from './utils/parse_html';
import {Mutex} from 'async-mutex';
import type {JobMetaInfo} from './shell';
import type {ExtensionSettings} from '@common/constants';
import type {CMDAssistantOption} from './core/command_assistant';
export type TerminalOptions = {
  ...ExtensionSettings,
};

//
export type MessageListenerData = {[string]: mixed};
export type MessageListenerCallback = (data: MessageListenerData) => Promise<mixed>;

const ALLOWED_FUNCS = ['eprint', 'print', 'printError', 'printTable', 'updateInputInfo', 'showQuestion', 'clean', 'printLive'];
const ALLOWED_SILENT_FUNCS = ['updateInputInfo', 'showQuestion', 'clean'];

const dummyCall = () => {
  // Do nothing
};
const dummyLive = () => ({update: dummyCall, el: document.createElement('span')});
export const ScreenCommandHandler = {
  get(target: {[string]: mixed}, prop: mixed): mixed {
    if (typeof prop !== 'string') {
      // $FlowFixMe[incompatible-type]
      return target[prop];
    }
    const ref = target[prop];
    if (typeof ref === 'function' && ALLOWED_FUNCS.includes(prop)) {
      // $FlowFixMe[incompatible-use]
      return ref.bind(target);
    }
    return target[prop];
  },
};
export const ScreenCommandSilentHandler = {
  get(target: {[string]: mixed}, prop: mixed): mixed {
    if (typeof prop !== 'string') {
      // $FlowFixMe[incompatible-type]
      return target[prop];
    }
    const ref = target[prop];
    if (typeof ref === 'function' && ALLOWED_FUNCS.includes(prop)) {
      // $FlowFixMe[incompatible-use]
      if (!ALLOWED_SILENT_FUNCS.includes(prop)) {
        return prop === 'printLive' ? dummyLive : dummyCall;
      }
      // $FlowFixMe[incompatible-use]
      return ref.bind(target);
    }
    return target[prop];
  },
};

export default class Terminal {
  VERSION = '12.0.0';

  userContext: {[string]: mixed} = {};

  screen: Screen;
  el: HTMLElement;
  runningCmdCount_el: HTMLElement;
  busyTooltip_el: HTMLElement | void;

  #shell: Shell;

  #config: TerminalOptions = {...SETTING_DEFAULTS};

  #rawTerminalTemplate: string = renderTerminal();

  #inputHistory: Array<string> = [];
  #searchHistoryQuery: string = '';
  #searchHistoryIter = 0;

  #hasExecInitCmds = false;

  #observer: MutationObserver;

  #commandAssistant: CommandAssistant;
  #assistantOptions: Array<CMDAssistantOption>;
  #assistantOptionsTotalCount = 0;
  #selAssistanOption: number = -1;

  #wasStart = false;
  #wasLoaded = false;

  #messageListeners: {[string]: Array<MessageListenerCallback>} = {};

  #boundDisableModalFocusTrap: () => void;

  #mutexAvailableOptions: AMutex = new Mutex();

  #isAIMode: boolean = false;
  #activeConvId: string | null = null;
  #aiConvList_el: HTMLElement | void;
  #aiInputHistory: Array<string> = [];

  constructor() {
    // $FlowFixMe[method-unbinding]
    this.#boundDisableModalFocusTrap = this.#disableModalFocusTrap.bind(this);
    this.#shell = new Shell({
      invokeExternalCommand: meta => this.#invokeExternalCommand(meta),
      onStartCommand: () => this.#updateJobsInfo(),
      onTimeoutCommand: () => this.#updateJobsInfo(),
      onFinishCommand: () => this.#updateJobsInfo(),
      commandTimeout: 30000,
    });
    this.screen = new Screen({
      username: i18n.t('terminal.unregisteredUser','Unregistered User'),
      host: window.location.host,
    });

    // Cached content
    const cachedScreen = getStorageSessionItem('terminal_screen');
    if (typeof cachedScreen === 'undefined') {
      this.printWelcomeMessage();
      this.screen.print('');
    } else {
      this.screen.print(cachedScreen);
      // RequestAnimationFrame(() => this.screen.scrollDown());
    }
    const cachedHistory = getStorageSessionItem('terminal_history');
    if (typeof cachedHistory !== 'undefined') {
      this.#inputHistory = cachedHistory;
      this.#searchHistoryIter = this.#inputHistory.length;
    }

    this.createTerminal();
  }

  init(settings: TerminalOptions) {
    this.#applySettings(settings);
    this.#wasLoaded = true;
    if (this.#config.pinned) {
      this.doShow();
      const elm = this.el.querySelector('.terminal-screen-icon-pin');
      if (elm) {
        elm.classList.remove('btn-dark');
        elm.classList.add('btn-light');
      }
    }
    if (this.#config.maximized) {
      this.el.classList.add('term-maximized');
      const elm = this.el.querySelector('.terminal-screen-icon-maximize');
      if (elm) {
        elm.classList.remove('btn-dark');
        elm.classList.add('btn-light');
      }
    }
    if (this.#config.multiline) {
      const elm = this.el.querySelector('.terminal-multiline');
      if (elm) {
        elm.classList.remove('btn-dark');
        elm.classList.add('btn-light');
      }
    }

    this.#applyTheme();

    // $FlowFixMe[method-unbinding]
    window.addEventListener('message', this.#onWindowMessage.bind(this), false);
    // $FlowFixMe[method-unbinding]
    window.addEventListener('keydown', this.#onCoreKeyDown.bind(this));
    // $FlowFixMe[method-unbinding]
    window.addEventListener('click', this.onCoreClick.bind(this));
    // $FlowFixMe[method-unbinding]
    window.addEventListener('beforeunload', this.#onCoreBeforeUnload.bind(this), true);
    // $FlowFixMe[method-unbinding]
    this.el.querySelector('.terminal-screen-icon-maximize')?.addEventListener('click', this.#onClickToggleMaximize.bind(this));
    // $FlowFixMe[method-unbinding]
    this.el.querySelector('.terminal-screen-icon-pin')?.addEventListener('click', this.#onClickToggleScreenPin.bind(this));
    // $FlowFixMe[method-unbinding]
    this.el.querySelector('.terminal-multiline')?.addEventListener('click', this.#onClickToggleMultiline.bind(this));
    // $FlowFixMe[method-unbinding]
    this.el.querySelector('.terminal-screen-icon-reload-shell')?.addEventListener('click', this.#onClickReloadShell.bind(this));
    // $FlowFixMe[method-unbinding]
    this.el.querySelector('.terminal-screen-icon-ai-mode')?.addEventListener('click', this.#onClickToggleAIMode.bind(this));
    // $FlowFixMe[method-unbinding]
    this.el.querySelector('.terminal-ai-new-conv')?.addEventListener('click', this.#onClickNewAIConv.bind(this));
    // $FlowFixMe[method-unbinding]
    this.el.querySelector('#terminal_ai_conv_list')?.addEventListener('click', this.#onClickAIConvList.bind(this));
    // Custom Events
    // $FlowFixMe[method-unbinding]
    this.el.addEventListener('toggle', this.#onTerminalToggle.bind(this));

    // AI sidebar state
    const aiConvListEl = this.el.querySelector('#terminal_ai_conv_list');
    if (aiConvListEl instanceof HTMLElement) {
      this.#aiConvList_el = aiConvListEl;
    }
    this.#isAIMode = getStorageSessionItem('terminal_ai_mode', false);
    this.#activeConvId = getStorageSessionItem('terminal_ai_active_conv', null);
    if (this.#isAIMode) {
      this.el.classList.add('terminal-ai-mode');
      const aiModeBtn = this.el.querySelector('.terminal-screen-icon-ai-mode');
      if (aiModeBtn) {
        aiModeBtn.classList.remove('btn-dark');
        aiModeBtn.classList.add('btn-light');
      }
      if (this.#activeConvId !== null) {
        this.#loadAIHistory(this.#activeConvId);
      }
      this.#renderAIConvList();
    }

    if (!isEmpty(this.#config.init_cmds)) {
      this.#wakeUp();
    }
  }

  /**
   * This is necessary to prevent terminal issues in Odoo EE
   */
  #initGuard() {
    if (typeof this.#observer === 'undefined' && document.body) {
      const target = document.body;
      this.#observer = new MutationObserver(() => {
        this.#injectTerminal();
      });
      this.#observer.observe(target, {childList: true});
    }
  }

  #injectTerminal(): void {
    const terms_elms = document.body?.querySelectorAll('.o_terminal:not(:first-child)') ?? [];
    if (terms_elms.length > 1) {
      // Remove extra terminals
      terms_elms.forEach(elm => elm.remove());
    } else if (terms_elms.length === 0) {
      this.el = parseHTML(this.#rawTerminalTemplate);
      document.body?.append(this.el);
    }
    const existing_tooltip = document.getElementById('terminal_busy_tooltip');
    if (!existing_tooltip) {
      const body = document.body;
      if (body) {
        const tooltip_el = parseHTML(renderBusyTooltip());
        body.append(tooltip_el);
        this.busyTooltip_el = tooltip_el;
      }
    } else if (existing_tooltip instanceof HTMLElement) {
      this.busyTooltip_el = existing_tooltip;
    }
  }

  #applyTheme() {
    const opacity = new String(this.#config.opacity * 0.01).toString();
    document.documentElement?.style.setProperty('--terminal-screen-ocapity', opacity);
    document.documentElement?.style.setProperty('--terminal-screen-font', this.#config.fontfamily);
    document.documentElement?.style.setProperty('--terminal-font-size', this.#config.fontsize);
    document.documentElement?.style.setProperty('--terminal-font-size-ca', this.#config.fontsize_ca);
    document.documentElement?.style.setProperty('--terminal-color-primary', this.#config.color_primary);
    document.documentElement?.style.setProperty('--terminal-color-secondary', this.#config.color_secondary);
    document.documentElement?.style.setProperty('--terminal-color-success', this.#config.color_success);
    document.documentElement?.style.setProperty('--terminal-color-danger', this.#config.color_danger);
    document.documentElement?.style.setProperty('--terminal-color-warning', this.#config.color_warning);
    document.documentElement?.style.setProperty('--terminal-color-info', this.#config.color_info);
    document.documentElement?.style.setProperty('--terminal-color-light', this.#config.color_light);
    document.documentElement?.style.setProperty('--terminal-color-dark', this.#config.color_dark);
    document.documentElement?.style.setProperty('--terminal-color-muted', this.#config.color_muted);
    document.documentElement?.style.setProperty('--terminal-color-white', this.#config.color_white);
  }

  async start(): Promise<> {
    if (!this.#wasLoaded) {
      throw new Error(i18n.t('terminal.error.notLoaded', 'Terminal not loaded'));
    }

    const elm = this.el.querySelector('#terminal_running_cmd_count');
    if (!elm) {
      throw new ElementNotFoundError('#terminal_running_cmd_count');
    }
    // $FlowFixMe[incompatible-type]
    this.runningCmdCount_el = elm;
    this.#commandAssistant = new CommandAssistant(this);
    this.screen.start(this.el, {
      inputColors: this.#config.colors_domain,
      inputMode: this.#config.multiline ? 'multi' : 'single',
      onSaveScreen: function (this: Terminal, content: string) {
        debounce(() => {
          setStorageSessionItem('terminal_screen', content, err => this.screen.print(err));
        }, 350);
      }.bind(this),
      onCleanScreen: () => {
        removeStorageSessionItem('terminal_screen');
      },
      onInputKeyUp: ev => {
        this.#onInputKeyUp(ev);
      },
      onInput: () => {
        this.#onInput();
      },
    });
    this.onStart();
  }

  // The terminal object should be never destroyed
  end() {
    if (typeof this.#observer !== 'undefined') {
      this.#observer.disconnect();
    }
    // $FlowFixMe[method-unbinding]
    window.removeEventListener('keydown', this.#onCoreKeyDown.bind(this));
    // $FlowFixMe[method-unbinding]
    window.removeEventListener('click', this.onCoreClick.bind(this));
    // $FlowFixMe[method-unbinding]
    window.removeEventListener('beforeunload', this.#onCoreBeforeUnload.bind(this), true);
    // $FlowFixMe[method-unbinding]
    this.el.removeEventListener('toggle', this.#onTerminalToggle.bind(this));
  }

  /* BASIC FUNCTIONS */
  getShell(): Shell {
    return this.#shell;
  }

  cleanInputHistory() {
    this.#inputHistory = [];
    removeStorageSessionItem('terminal_screen');
  }

  #saveCurrentScreenSnapshot() {
    if (this.#isAIMode && this.#activeConvId !== null) {
      setStorageSessionItem(
        `terminal_ai_screen_${this.#activeConvId}`,
        this.screen.getContent(),
        err => this.screen.printError(err),
      );
    } else if (!this.#isAIMode) {
      setStorageSessionItem(
        'terminal_ai_normal_screen',
        this.screen.getContent(),
        err => this.screen.printError(err),
      );
    }
  }

  async #wakeUp(): Promise<> {
    if (this.#wasLoaded) {
      if (!this.#wasStart) {
        await this.start();
        this.#wasStart = true;
        this.screen.flush();

        // On first start in AI mode, replace buffered normal screen with the active conv screen
        if (this.#isAIMode) {
          const activeId = this.#activeConvId;
          if (activeId !== null) {
            const snap: string = getStorageSessionItem(`terminal_ai_screen_${activeId}`, '');
            if (snap.length > 0) {
              this.screen.setContent(snap);
            } else {
              this.screen.clean();
            }
          } else {
            this.screen.clean();
          }
        }

        // Init commands
        if (!this.#hasExecInitCmds) {
          if (this.#config.init_cmds) {
            await this.execute(this.#config.init_cmds, false, true);
          }
          this.#hasExecInitCmds = true;
        }
      }
    } else {
      throw new Error(i18n.t('terminal.notLoaded', 'Terminal not loaded'));
    }
  }

  #parseAlias(aliases: {[string]: string}, cmd_name: string, args: $ReadOnlyArray<string>): string | void {
    let alias_cmd = aliases[cmd_name];
    if (alias_cmd) {
      const params_len = args.length;
      let index = 0;
      while (index < params_len) {
        const re = new RegExp(`\\$${Number(index) + 1}(?:\\[[^\\]]+\\])?`, 'g');
        alias_cmd = alias_cmd.replaceAll(re, args[index]);
        ++index;
      }
      alias_cmd = alias_cmd.replaceAll(/\$\d+(?:\[([^\]]+)\])?/g, (_, group) => {
        return group || '';
      });
      return alias_cmd;
    }
    return undefined;
  }

  // $FlowFixMe[unclear-type]
  async execute(code: string, store: boolean = true, silent: boolean = false, isolated_frame: boolean = false, update_input: boolean = true): Promise<any> {
    if (!silent) {
      this.screen.printCommand(code);
    }
    if (update_input) {
      this.screen.cleanInput();
      this.updateAssistantoptions();
    }
    if (store) {
      this.#storeUserInput(code);
    }

    let cmd_res: mixed;
    try {
      cmd_res = await this.#shell.eval(code, {
        silent: silent,
        aliases: getStorageLocalItem('terminal_aliases', {}),
      }, isolated_frame);
    } catch (err) {
      this.screen.printError(`${err.name}: ${err.message}`);
      let err_msg = err.data;
      if (err.constructor === UnknownCommandError) {
        // Search similar commands
        const similar_cmd = this.#commandAssistant.searchSimiliarCommand(err.cmd_name);
        if (typeof similar_cmd !== 'undefined') {
          err_msg = i18n.t(
            'terminal.unknownCommand',
            "Unknown command '{{org_cmd}}' at {{start}}:{{end}}. Did you mean '<strong class='o_terminal_click o_terminal_cmd' data-cmd='help {{cmd}}'>{{cmd}}</strong>'?",
            {
              org_cmd: err.cmd_name,
              start: err.start,
              end: err.end,
              cmd: similar_cmd,
            },
          );
        }
      }
      this.screen.printError(err_msg, true);
      if (this.#config.devmode_console_errors) {
        logger.error('core', err);
      }
      throw err;
    }
    return cmd_res;
  }

  async #invokeExternalCommand(meta: JobMetaInfo): Promise<mixed> {
    const aliases = getStorageLocalItem('terminal_aliases', {});
    if (meta.info.cmdName in aliases) {
      const alias_cmd = this.#parseAlias(aliases, meta.info.cmdName, meta.info.args);
      return await this.#shell.eval(alias_cmd || "", {
        silent: meta.silent,
        aliases: aliases,
      });
    }

    if (typeof meta.info.cmdDef.callback === 'undefined') {
      throw new InvalidCommandDefintionError();
    }

    // $FlowFixMe[class-object-subtyping]
    const call_ctx = {
      meta: meta,
      // $FlowFixMe[class-object-subtyping]
      // $FlowFixMe[incompatible-variance]
      // $FlowFixMe[incompatible-type]
      screen: meta.silent ? new Proxy(this.screen, ScreenCommandSilentHandler) : new Proxy(this.screen, ScreenCommandHandler),
    };
    const cb = meta.info.cmdDef.callback;
    // $FlowFixMe[incompatible-type]
    return await cb.call(this, meta.info.kwargs, call_ctx);
  }

  /* VISIBILIY */
  async doShow() {
    if (!this.#wasLoaded) {
      return;
    }
    // Only start the terminal if needed
    await this.#wakeUp();
    // Re-disable the trap if a new modal opens while the terminal is visible.
    // Bootstrap 5 fires native DOM events; Bootstrap 4 fires only jQuery events.
    document.addEventListener('shown.bs.modal', this.#boundDisableModalFocusTrap);
    try {
      // $FlowFixMe[prop-missing]
      window.$(document).on('shown.bs.modal', this.#boundDisableModalFocusTrap);
    } catch (_err) {
      // jQuery not available
    }
    this.#disableModalFocusTrap();
    this.screen.show();
    this.#updateJobsInfo();
  }

  async doHide() {
    document.removeEventListener('shown.bs.modal', this.#boundDisableModalFocusTrap);
    try {
      // $FlowFixMe[prop-missing]
      window.$(document).off('shown.bs.modal', this.#boundDisableModalFocusTrap);
    } catch (_err) {
      // jQuery not available
    }
    this.#enableModalFocusTrap();
    this.screen.hide();
    this.#updateJobsInfo();
  }

  doToggle(show: boolean | void): Promise<> {
    if (typeof show === 'undefined') {
      if (this.#isTerminalVisible()) {
        return this.doHide();
      }
      return this.doShow();
    } else if (show) {
      return this.doShow();
    }
    return this.doHide();
  }

  createTerminal() {
    this.#injectTerminal();
    this.#initGuard();
  }

  async getContext(extra_context: ?{[string]: mixed}): Promise<{[string]: mixed}> {
    return {...this.userContext, ...extra_context};
  }

  /* PRIVATE METHODS*/
  #getActiveHistory(): Array<string> {
    return this.#isAIMode ? this.#aiInputHistory : this.#inputHistory;
  }

  #storeUserInput(strInput: string) {
    if (this.#inputHistory.at(-1) === strInput) {
      return;
    }
    this.#inputHistory.push(strInput);
    setStorageSessionItem('terminal_history', this.#inputHistory, err => this.screen.printError(err, true));
    this.#searchHistoryIter = this.#inputHistory.length;
  }

  #storeAIInput(strInput: string) {
    const convId = this.#activeConvId;
    if (convId === null) {
      return;
    }
    if (this.#aiInputHistory.at(-1) === strInput) {
      return;
    }
    this.#aiInputHistory.push(strInput);
    setStorageLocalItem(`terminal_ai_history_${convId}`, this.#aiInputHistory, err => this.screen.printError(err));
    this.#searchHistoryIter = this.#aiInputHistory.length;
  }

  #loadAIHistory(convId: string) {
    this.#aiInputHistory = getStorageLocalItem(`terminal_ai_history_${convId}`, []);
    this.#searchHistoryIter = this.#aiInputHistory.length;
    this.#searchHistoryQuery = '';
  }

  #isTerminalVisible(): boolean {
    return this.el.classList.contains('terminal-transition-topdown');
  }

  printWelcomeMessage() {
    this.screen.print(renderWelcome(this.VERSION));
  }

  #doSearchPrevHistory(): string | void {
    const hist = this.#getActiveHistory();
    const orig_iter = this.#searchHistoryIter;
    const last_str = hist[this.#searchHistoryIter];
    this.#searchHistoryIter = hist.findLastIndex((item, i) => {
      if (this.#searchHistoryQuery) {
        return item !== last_str && item.indexOf(this.#searchHistoryQuery) === 0 && i <= this.#searchHistoryIter;
      }
      return i < this.#searchHistoryIter;
    });
    if (this.#searchHistoryIter === -1) {
      this.#searchHistoryIter = orig_iter;
      return undefined;
    }
    return hist[this.#searchHistoryIter];
  }

  #doSearchNextHistory(): string | void {
    const hist = this.#getActiveHistory();
    const last_str = hist[this.#searchHistoryIter];
    this.#searchHistoryIter = hist.findIndex((item, i) => {
      if (this.#searchHistoryQuery) {
        return item !== last_str && item.indexOf(this.#searchHistoryQuery) === 0 && i >= this.#searchHistoryIter;
      }
      return i > this.#searchHistoryIter;
    });
    if (this.#searchHistoryIter === -1) {
      this.#searchHistoryIter = hist.length;
      return undefined;
    }
    return hist[this.#searchHistoryIter];
  }

  #updateJobsInfo() {
    if (!this.#wasStart) {
      return;
    }
    const active_jobs = this.#shell.getActiveJobs();
    const count = active_jobs.length;
    if (count) {
      const count_unhealthy = active_jobs.filter(item => !item.healthy).length;
      let str_info = i18n.t('terminal.info.job.running', 'Running {{count}} command(s)', {count});
      if (count_unhealthy) {
        str_info += i18n.t('terminal.info.job.unhealthy', ' ({{count_unhealthy}} unhealthy)', {count: count_unhealthy});
      }
      str_info += '...';
      this.runningCmdCount_el.textContent = str_info;
      this.runningCmdCount_el.classList.remove('hidden');
      const tooltip = this.busyTooltip_el;
      if (tooltip) {
        const text_el = tooltip.querySelector('.o_terminal-busy-tooltip-text');
        if (text_el instanceof HTMLElement) {
          const tooltip_text =
            count === 1
              ? `${active_jobs[0].cmdInfo.cmdName}...`
              : str_info;
          text_el.textContent = tooltip_text;
        }
        if (!this.#isTerminalVisible()) {
          tooltip.classList.add('active');
        } else {
          tooltip.classList.remove('active');
        }
      }
    } else {
      this.runningCmdCount_el.classList.add('hidden');
      this.runningCmdCount_el.textContent = '';
      const tooltip = this.busyTooltip_el;
      if (tooltip) {
        tooltip.classList.remove('active');
      }
    }
  }

  #applySettings(config: TerminalOptions) {
    this.#config = {
      ...this.#config,
      ...config,
    }
    this.#config.term_context = this.#config.term_context || {};
    this.userContext = {...this.#config.term_context, ...this.userContext};
  }

  updateAssistantoptions() {
    if (this.#isAIMode) {
      this.#assistantOptions = [];
      this.#assistantOptionsTotalCount = 0;
      this.screen.updateAssistantPanelOptions([], -1, 0);
      return;
    }
    this.#mutexAvailableOptions.cancel();
    this.#mutexAvailableOptions.release();
    this.#mutexAvailableOptions
      .runExclusive(async () => {
        const user_input = this.screen.getUserInput();
        if (typeof user_input === 'undefined' || user_input.length === 0) {
          // $FlowFixMe[missing-empty-array-annot]
          return [];
        }
        return await this.#commandAssistant.getAvailableOptions(
          user_input,
          this.screen.getInputCaretStartPos(),
          this.#config.cmd_assistant_match_mode,
          this.#config.cmd_assistant_dyn_options_disabled,
        );
      })
      .then(options => {
        this.#selAssistanOption = -1;
        this.#assistantOptions = options.slice(0, this.#config.cmd_assistant_max_results);
        this.#assistantOptionsTotalCount = options.length;
        this.screen.updateAssistantPanelOptions(
          this.#assistantOptions,
          this.#selAssistanOption,
          this.#assistantOptionsTotalCount,
        );
      });
  }

  /* HANDLE EVENTS */
  onStart() {
    // Override me
  }

  addMessageListener(type: string, callback: MessageListenerCallback) {
    if (!Object.hasOwn(this.#messageListeners, type)) {
      this.#messageListeners = {
        ...this.#messageListeners,
        [type]: [],
      };
    }
    if (this.#messageListeners[type].filter(item => item.name === callback.name).length === 0) {
      this.#messageListeners[type].push(callback);
    }
  }
  removeMessageListener(type: string, callback: MessageListenerCallback) {
    if (typeof callback === 'undefined') {
      delete this.#messageListeners[type];
    } else {
      this.#messageListeners[type] = this.#messageListeners[type].filter(item => item.name !== callback.name);
    }
  }
  #onWindowMessage(ev: MessageEvent) {
    // We only accept messages from ourselves
    if (ev.source !== window) {
      return;
    }
    // $FlowFixMe[incompatible-type]
    const ev_data: {[string]: mixed} = {...ev.data};
    // $FlowFixMe[incompatible-type]
    if (Object.hasOwn(this.#messageListeners, ev_data.type)) {
      // $FlowFixMe[incompatible-type]
      this.#messageListeners[ev_data.type].forEach((callback: MessageListenerCallback) => callback.bind(this)(ev_data));
    }
  }

  #onTerminalToggle() {
    this.doToggle();
  }

  #disableModalFocusTrap() {
    // Bootstrap 4: remove jQuery focus trap and patch the instance so Odoo
    // can't re-attach it by calling _enforceFocus() again after shown.bs.modal
    try {
      // $FlowFixMe[prop-missing]
      window.$(document).off('focusin.bs.modal');
      document.querySelectorAll('.modal.show').forEach(el => {
        // $FlowFixMe[prop-missing]
        const instance = window.$(el).data('bs.modal');
        if (instance && typeof instance._enforceFocus === 'function' && !instance.__origEnforceFocus) {
          instance.__origEnforceFocus = instance._enforceFocus;
          instance._enforceFocus = () => undefined;
        }
      });
    } catch (_err) {
      // jQuery or Bootstrap 4 not available
    }
    // Bootstrap 5: internal FocusTrap instance
    document.querySelectorAll('.modal.show').forEach(el => {
      try {
        // $FlowFixMe[prop-missing]
        const instance = window.bootstrap?.Modal?.getInstance(el);
        // $FlowFixMe[prop-missing]
        instance?._focustrap?.deactivate();
      } catch (_err) {
        // Instance or method not available
      }
    });
  }

  #enableModalFocusTrap() {
    document.querySelectorAll('.modal.show').forEach(el => {
      try {
        // Bootstrap 5
        // $FlowFixMe[prop-missing]
        const bs5 = window.bootstrap?.Modal?.getInstance(el);
        if (bs5) {
          // $FlowFixMe[prop-missing]
          bs5._focustrap?.activate();
          return;
        }
        // Bootstrap 4: restore patched _enforceFocus and re-apply trap
        // $FlowFixMe[prop-missing]
        const bs4 = window.$(el).data('bs.modal');
        if (bs4?.__origEnforceFocus) {
          bs4._enforceFocus = bs4.__origEnforceFocus;
          delete bs4.__origEnforceFocus;
          bs4._enforceFocus();
        }
      } catch (_err) {
        // Instance or method not available
      }
    });
  }

  #onClickTerminalCommand(target: HTMLElement) {
    if (Object.hasOwn(target.dataset, 'cmd')) {
      this.execute(target.dataset.cmd).catch(() => {
        // Do nothing
      });
    }
  }

  #onClickToggleMaximize(ev: MouseEvent) {
    this.#config.maximized = !this.#config.maximized;
    if (ev.currentTarget instanceof HTMLElement) {
      const target = ev.currentTarget;
      if (this.#config.maximized) {
        this.el.classList.add('term-maximized');
        target.classList.remove('btn-dark');
        target.classList.add('btn-light');
      } else {
        this.el.classList.remove('term-maximized');
        target.classList.remove('btn-light')
        target.classList.add('btn-dark');
      }
    }
    setStorageSessionItem('screen_maximized', this.#config.maximized, err => this.screen.print(err));
    this.screen.scrollDown();
    this.screen.preventLostInputFocus();
  }

  #onClickToggleScreenPin(ev: MouseEvent) {
    this.#config.pinned = !this.#config.pinned;
    if (ev.currentTarget instanceof HTMLElement) {
      const target = ev.currentTarget;
      if (this.#config.pinned) {
        target.classList.remove('btn-dark');
        target.classList.add('btn-light');
      } else {
        target.classList.remove('btn-light')
        target.classList.add('btn-dark');
      }
    }
    setStorageSessionItem('terminal_pinned', this.#config.pinned, err => this.screen.print(err));
    this.screen.preventLostInputFocus();
  }

  #onClickToggleMultiline(ev: MouseEvent) {
    const question_active = this.screen.getQuestionActive();
    if (typeof question_active !== 'undefined') {
      return;
    }
    this.#config.multiline = !this.#config.multiline;
    if (ev.currentTarget instanceof HTMLElement) {
      const target = ev.currentTarget;
      if (this.#config.multiline) {
        target.classList.remove('btn-dark');
        target.classList.add('btn-light');
        this.screen.setInputMode('multi');
      } else {
        target.classList.remove('btn-light')
        target.classList.add('btn-dark');
        this.screen.setInputMode('single');
      }
    }
    setStorageSessionItem('terminal_multiline', this.#config.multiline, err => this.screen.print(err));
    this.screen.preventLostInputFocus();
  }

  #onClickReloadShell() {
    this.screen.refresh();
    this.cleanInputHistory();
    this.#shell.getVM().cleanGlobals();
    this.#updateJobsInfo();
    this.updateAssistantoptions();
    if (!this.#isAIMode) {
      this.printWelcomeMessage();
    }
  }

  #onKeyEnter() {
    if (this.#isAIMode) {
      const input = this.screen.getUserInput();
      if (!input.trim()) {
        return;
      }
      this.screen.printCommand(input);
      this.#storeAIInput(input);
      this.screen.cleanInput();
      this.updateAssistantoptions();
      if (this.#activeConvId === null) {
        this.createAIConversation(input.slice(0, 40) || i18n.t('terminal.ai.newConversation', 'New conversation'));
      }
      this.onAIModeInput(input).catch(() => {
        // Do nothing
      });
      this.screen.preventLostInputFocus();
      return;
    }
    this.execute(this.screen.getUserInput()).catch(() => {
      // Do nothing
    });
    this.#searchHistoryQuery = '';
    this.#searchHistoryIter = this.#inputHistory.length;
    this.screen.preventLostInputFocus();
  }
  #onKeyArrowUp() {
    if (typeof this.#searchHistoryQuery === 'undefined') {
      this.#searchHistoryQuery = this.screen.getUserInput();
    }
    const found_hist = this.#doSearchPrevHistory();
    if (typeof found_hist !== 'undefined' && found_hist !== '') {
      this.screen.updateInput(found_hist);
    }
  }
  #onKeyArrowDown() {
    if (typeof this.#searchHistoryQuery === 'undefined') {
      this.#searchHistoryQuery = this.screen.getUserInput();
    }
    const found_hist = this.#doSearchNextHistory();
    if (typeof found_hist !== 'undefined' && found_hist !== '') {
      this.screen.updateInput(found_hist);
    } else {
      this.#searchHistoryQuery = '';
      this.screen.cleanInput();
    }
  }
  #onKeyArrowRight(ev: KeyboardEvent) {
    const user_input = this.screen.getUserInput();
    if (user_input && ev.target instanceof HTMLInputElement && ev.target.selectionStart === user_input.length) {
      const histLen = this.#getActiveHistory().length;
      this.#searchHistoryQuery = user_input;
      this.#searchHistoryIter = histLen;
      this.#onKeyArrowUp();
      this.#searchHistoryQuery = user_input;
      this.#searchHistoryIter = histLen;
    }
    this.updateAssistantoptions();
  }
  #onKeyArrowLeft() {
    this.updateAssistantoptions();
  }
  #onKeyTab(ev: KeyboardEvent) {
    const user_input = this.screen.getUserInput();
    if (isEmpty(user_input)) {
      return;
    }
    const parse_info = this.#shell.parse(user_input);
    const [sel_cmd_index, sel_token_index, _unused, sel_level] = this.#commandAssistant.getSelectedParameterIndex(
      parse_info,
      this.screen.getInputCaretStartPos(),
    );
    if (typeof sel_cmd_index === 'undefined') {
      return;
    }
    const cur_token = parse_info.inputTokens[sel_level][sel_token_index];
    if (ev.shiftKey) {
      --this.#selAssistanOption;
    } else {
      ++this.#selAssistanOption;
    }
    if (this.#selAssistanOption >= this.#assistantOptions.length) {
      this.#selAssistanOption = 0;
    } else if (this.#selAssistanOption < 0) {
      this.#selAssistanOption = this.#assistantOptions.length - 1;
    }
    const option = this.#assistantOptions[this.#selAssistanOption];
    if (typeof option === 'undefined') {
      return;
    }
    if (typeof option.string !== 'undefined') {
      this.screen.replaceUserInputToken(parse_info.inputRawString, cur_token, option.string);
    }
    this.screen.updateAssistantPanelOptions(
      this.#assistantOptions,
      this.#selAssistanOption,
      this.#assistantOptionsTotalCount,
    );
  }

  #onInput() {
    const question_active = this.screen.getQuestionActive();
    if (typeof question_active === 'undefined') {
      // Fish-like feature
      this.updateAssistantoptions();
      const user_input = this.screen.getUserInput();
      this.#searchHistoryQuery = user_input;
      this.#searchHistoryIter = this.#inputHistory.length;
      if (user_input) {
        const found_hist = this.#doSearchPrevHistory();
        this.screen.updateShadowInput(found_hist || '');
        this.#searchHistoryIter = this.#inputHistory.length;
      } else {
        this.screen.cleanShadowInput();
      }
    }
  }

  #onInputKeyUp(ev: KeyboardEvent) {
    const question_active = this.screen.getQuestionActive();
    if (typeof question_active === 'undefined') {
      if (this.#config.multiline) {
        if (ev.ctrlKey && ev.keyCode === keyCode.ENTER) {
          this.#onKeyEnter();
        }
      } else {
        if (ev.keyCode === keyCode.ENTER) {
          this.#onKeyEnter();
        } else if (ev.keyCode === keyCode.UP) {
          this.#onKeyArrowUp();
        } else if (ev.keyCode === keyCode.DOWN) {
          this.#onKeyArrowDown();
        } else if (ev.keyCode === keyCode.RIGHT) {
          this.#onKeyArrowRight(ev);
        } else if (ev.keyCode === keyCode.LEFT) {
          this.#onKeyArrowLeft();
        } else if (ev.keyCode === keyCode.TAB) {
          this.#onKeyTab(ev);
        } else {
          this.#searchHistoryIter = this.#inputHistory.length;
          this.#searchHistoryQuery = '';
        }
      }
    } else {
      if (ev.keyCode === keyCode.ENTER) {
        this.screen.responseQuestion(question_active, ev.target instanceof HTMLInputElement ? ev.target.value : '');
      } else if (ev.keyCode === keyCode.ESCAPE) {
        this.screen.rejectQuestion(question_active, i18n.t('terminal.question.aborted', 'Operation aborted'));
        ev.preventDefault();
      }
    }
  }

  /* AI CONVERSATIONS */
  #getConversations(): Array<AIConversation> {
    return getStorageLocalItem('terminal_ai_conversations', []);
  }

  #saveConversations(convs: Array<AIConversation>) {
    setStorageLocalItem('terminal_ai_conversations', convs, err => this.screen.printError(err));
  }

  #renderAIConvList() {
    const listEl = this.#aiConvList_el;
    if (!listEl) {
      return;
    }
    const convs = this.#getConversations();
    if (convs.length === 0) {
      listEl.innerHTML = '';
      return;
    }
    listEl.innerHTML = convs.map(c => renderAIConvItem(c.id, c.name, c.id === this.#activeConvId)).join('');
  }

  #onClickToggleAIMode(ev: MouseEvent) {
    this.#saveCurrentScreenSnapshot();
    this.#isAIMode = !this.#isAIMode;
    this.screen.clean();
    if (ev.currentTarget instanceof HTMLElement) {
      const target = ev.currentTarget;
      if (this.#isAIMode) {
        this.el.classList.add('terminal-ai-mode');
        target.classList.remove('btn-dark');
        target.classList.add('btn-light');
        this.#renderAIConvList();
        this.updateAssistantoptions();
        const activeId = this.#activeConvId;
        if (activeId !== null) {
          this.#loadAIHistory(activeId);
          const snap: string = getStorageSessionItem(`terminal_ai_screen_${activeId}`, '');
          if (snap.length > 0) {
            this.screen.setContent(snap);
          }
        } else {
          this.#aiInputHistory = [];
          this.#searchHistoryIter = 0;
          this.#searchHistoryQuery = '';
        }
      } else {
        this.el.classList.remove('terminal-ai-mode');
        target.classList.remove('btn-light');
        target.classList.add('btn-dark');
        this.updateAssistantoptions();
        this.#searchHistoryIter = this.#inputHistory.length;
        this.#searchHistoryQuery = '';
        const snap: string = getStorageSessionItem('terminal_ai_normal_screen', '');
        if (snap.length > 0) {
          this.screen.setContent(snap);
        }
      }
    }
    setStorageSessionItem('terminal_ai_mode', this.#isAIMode, err => this.screen.printError(err));
    this.screen.preventLostInputFocus();
  }

  #onClickNewAIConv() {
    this.#saveCurrentScreenSnapshot();
    this.screen.clean();
    this.#aiInputHistory = [];
    this.#searchHistoryIter = 0;
    this.#searchHistoryQuery = '';
    this.createAIConversation(i18n.t('terminal.ai.newConversation', 'New conversation'));
    this.screen.print(
      i18n.t('terminal.ai.experimentalWarning', 'This mode is experimental; use it with extreme caution.'),
      false,
      'line-warning',
    );
    this.screen.preventLostInputFocus();
  }

  #onClickAIConvList(ev: MouseEvent) {
    if (!(ev.target instanceof HTMLElement)) {
      return;
    }
    const target: HTMLElement = ev.target;
    let isDelete = false;
    let convEl: HTMLElement | null = null;
    let cur: HTMLElement | null = target;
    while (cur && !cur.classList.contains('terminal-ai-conv-list')) {
      if (cur.classList.contains('terminal-ai-conv-delete')) {
        isDelete = true;
      }
      if (cur.classList.contains('terminal-ai-conv-item')) {
        convEl = cur;
        break;
      }
      // $FlowFixMe[incompatible-type]
      cur = cur.parentElement;
    }
    if (!convEl) {
      return;
    }
    const convId = convEl.dataset['convId'];
    if (!convId) {
      return;
    }
    if (isDelete) {
      ev.stopPropagation();
      let convs = this.#getConversations();
      convs = convs.filter(c => c.id !== convId);
      this.#saveConversations(convs);
      removeStorageLocalItem(`terminal_ai_conv_${convId}`);
      removeStorageLocalItem(`terminal_ai_history_${convId}`);
      removeStorageSessionItem(`terminal_ai_screen_${convId}`);
      if (this.#activeConvId === convId) {
        const nextId = convs.length > 0 ? convs[0].id : null;
        this.#activeConvId = nextId;
        setStorageSessionItem('terminal_ai_active_conv', nextId, err => this.screen.printError(err));
        this.screen.clean();
        if (nextId !== null) {
          this.#loadAIHistory(nextId);
          const snap: string = getStorageSessionItem(`terminal_ai_screen_${nextId}`, '');
          if (snap.length > 0) {
            this.screen.setContent(snap);
          }
        } else {
          this.#aiInputHistory = [];
          this.#searchHistoryIter = 0;
          this.#searchHistoryQuery = '';
        }
      }
      this.#renderAIConvList();
    } else if (convId !== this.#activeConvId) {
      this.#saveCurrentScreenSnapshot();
      this.#activeConvId = convId;
      setStorageSessionItem('terminal_ai_active_conv', convId, err => this.screen.printError(err));
      this.#loadAIHistory(convId);
      this.screen.clean();
      const snap: string = getStorageSessionItem(`terminal_ai_screen_${convId}`, '');
      if (snap.length > 0) {
        this.screen.setContent(snap);
      }
      this.#renderAIConvList();
      this.screen.preventLostInputFocus();
    }
  }

  getActiveConvId(): string | null {
    return this.#activeConvId;
  }

  getConvMessages(id: string): Array<AIMessage> {
    return getStorageLocalItem(`terminal_ai_conv_${id}`, []);
  }

  saveConvMessages(id: string, messages: Array<AIMessage>) {
    setStorageLocalItem(`terminal_ai_conv_${id}`, messages, err => this.screen.printError(err));
  }

  updateConvName(id: string, name: string) {
    const convs = this.#getConversations();
    const conv = convs.find(c => c.id === id);
    if (conv) {
      conv.name = name;
      this.#saveConversations(convs);
      this.#renderAIConvList();
    }
  }

  createAIConversation(name: string): string {
    const id = `conv_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const convs = this.#getConversations();
    convs.unshift({id, name, createdAt: Date.now()});
    this.#saveConversations(convs);
    this.#activeConvId = id;
    setStorageSessionItem('terminal_ai_active_conv', id, err => this.screen.printError(err));
    this.#renderAIConvList();
    return id;
  }

  // eslint-disable-next-line no-unused-vars
  async onAIModeInput(input: string): Promise<> {
    this.screen.printError(i18n.t('terminal.ai.notConnected', 'AI not connected. Use "ai connect" first.'));
  }

  onCoreClick(ev: MouseEvent) {
    if (
      this.busyTooltip_el &&
      ev.target instanceof HTMLElement &&
      (this.busyTooltip_el === ev.target || this.busyTooltip_el.contains(ev.target))
    ) {
      this.doShow().catch(() => {
        // Do nothing
      });
    } else if (
      // Auto-Hide: use composedPath() so DOM mutations in earlier handlers don't
      // cause ev.target to appear detached and falsely trigger hide.
      this.el &&
      !ev.composedPath().includes(this.el) &&
      this.#isTerminalVisible() &&
      !this.#config.maximized &&
      !this.#config.pinned
    ) {
      this.doHide();
    } else if (ev.target instanceof HTMLElement && ev.target.classList.contains('o_terminal_cmd')) {
      // $FlowFixMe[incompatible-type]
      this.#onClickTerminalCommand(ev.target);
    }
  }
  #onCoreKeyDown(this: Terminal, ev: KeyboardEvent) {
    // Don't crash when press keys!
    try {
      if (ev.keyCode === keyCode.ESCAPE && this.#isTerminalVisible() && isEmpty(this.screen.getQuestionActive())) {
        this.doHide();
      } else {
        const keybind = processKeybind(ev);
        const keybind_str = JSON.stringify(keybind);
        const keybind_cmds = this.#config.shortcuts[keybind_str];
        if (keybind_cmds) {
          this.execute(keybind_cmds, false, true);
          ev.preventDefault();
        }
      }
    } catch (_err) {
      // Do nothing
    }
  }
  #onCoreBeforeUnload(ev: BeforeUnloadEvent) {
    const jobs = this.#shell.getActiveJobs();
    if (jobs.length) {
      if (jobs.length === 1 && (!jobs[0] || ['reload', 'login'].indexOf(jobs[0].cmdInfo.cmdName) !== -1)) {
        return;
      }
      ev.preventDefault();
      ev.returnValue = '';
      this.screen.print(
        i18n.t(
          'terminal.close.prevented',
          'The terminal has prevented the current tab from closing due to unfinished tasks:',
        ),
      );
      this.screen.print(jobs.map(item => `${item.cmdInfo.cmdName} <small><i>${item.cmdInfo.cmdRaw}</i></small>`));
      this.doShow();
    }
  }
}
