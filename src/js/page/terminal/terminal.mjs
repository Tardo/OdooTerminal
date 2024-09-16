// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
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
import {getStorageItem as getStorageLocalItem} from './core/storage/local';
import {
  getStorageItem as getStorageSessionItem,
  removeStorageItem as removeStorageSessionItem,
  setStorageItem as setStorageSessionItem,
} from './core/storage/session';
import renderTerminal from './templates/terminal';
import renderWelcome from './templates/welcome';
import debounce from './utils/debounce';
import keyCode from './utils/keycode';
import parseHTML from './utils/parse_html';
// $FlowIgnore
import {Mutex} from 'async-mutex';
import type {JobMetaInfo} from './shell';
import type {ExtensionSettings} from '@common/constants';
import type {CMDAssistantOption} from './core/command_assistant';
export type TerminalOptions = {
  commandTimeout: number,
  ...ExtensionSettings,
};

//
export type MessageListenerCallback = (data: {[string]: mixed}) => Promise<mixed>;

const ALLOWED_FUNCS = ['eprint', 'print', 'printError', 'printTable', 'updateInputInfo', 'showQuestion', 'clean'];
const ALLOWED_SILENT_FUNCS = ['updateInputInfo', 'showQuestion', 'clean'];

const dummyCall = () => {
  // Do nothing
};
export const ScreenCommandHandler = {
  silent: false,

  // $FlowFixMe
  get<T>(this: T, target: Object, prop: mixed): mixed {
    const ref = target[prop];
    if (typeof ref === 'function' && ALLOWED_FUNCS.includes(prop)) {
      // $FlowFixMe
      if (this.silent && !ALLOWED_SILENT_FUNCS.includes(prop)) {
        return dummyCall;
      }
      return ref.bind(target);
    }
    return target[prop];
  },
};

export default class Terminal {
  VERSION = '11.5.0';

  userContext: {[string]: mixed} = {};

  screen: Screen;
  el: HTMLElement;
  runningCmdCount_el: HTMLElement;

  #shell: Shell;

  #config: TerminalOptions = {...SETTING_DEFAULTS, commandTimeout: 30000};

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

  #mutexAvailableOptions: AMutex = new Mutex();

  constructor() {
    this.#shell = new Shell({
      invokeExternalCommand: meta => this.#invokeExternalCommand(meta),
      onStartCommand: () => this.#updateJobsInfo(),
      onTimeoutCommand: () => this.#updateJobsInfo(),
      onFinishCommand: () => this.#updateJobsInfo(),
    });
    this.screen = new Screen({
      username: 'Unregistered User',
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

    // $FlowFixMe
    window.addEventListener('message', this.#onWindowMessage.bind(this), false);
    // $FlowFixMe
    window.addEventListener('keydown', this.#onCoreKeyDown.bind(this));
    // $FlowFixMe
    window.addEventListener('click', this.onCoreClick.bind(this));
    // $FlowFixMe
    window.addEventListener('beforeunload', this.#onCoreBeforeUnload.bind(this), true);
    // $FlowFixMe
    this.el.querySelector('.terminal-screen-icon-maximize').addEventListener('click', this.#onClickToggleMaximize.bind(this));
    // $FlowFixMe
    this.el.querySelector('.terminal-screen-icon-pin').addEventListener('click', this.#onClickToggleScreenPin.bind(this));
    // $FlowFixMe
    this.el.querySelector('.terminal-multiline').addEventListener('click', this.#onClickToggleMultiline.bind(this));
    // $FlowFixMe
    this.el.querySelector('.terminal-screen-icon-reload-shell').addEventListener('click', this.#onClickReloadShell.bind(this));
    // Custom Events
    // $FlowFixMe
    this.el.addEventListener('toggle', this.#onTerminalToggle.bind(this));

    if (!isEmpty(this.#config.init_cmds)) {
      this.#wakeUp();
    }
  }

  /**
   * This is necessary to prevent terminal issues in Odoo EE
   */
  #initGuard() {
    if (this.#observer === null && document.body) {
      const target = document.body;
      this.#observer = new MutationObserver(() => {
        this.#injectTerminal();
      });
      this.#observer.observe(target, {childList: true});
    }
  }

  #injectTerminal(): void {
    // $FlowFixMe
    const terms_elms = document.body.querySelectorAll('.o_terminal:not(:first-child)');
    if (terms_elms.length > 1) {
      // Remove extra terminals
      terms_elms.forEach(elm => elm.remove());
    } else if (terms_elms.length === 0) {
      this.el = parseHTML(this.#rawTerminalTemplate);
      document.body?.append(this.el);
    }
  }

  async start(): Promise<> {
    if (!this.#wasLoaded) {
      throw new Error(i18n.t('terminal.error.notLoaded', 'Terminal not loaded'));
    }

    const elm = this.el.querySelector('#terminal_running_cmd_count');
    if (!elm) {
      throw new ElementNotFoundError('#terminal_running_cmd_count');
    }
    this.runningCmdCount_el = elm;
    this.#commandAssistant = new CommandAssistant(this);
    this.screen.start(this.el, {
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
    this.screen.applyStyle('opacity', new String(this.#config.opacity).toString());
    this.onStart();
  }

  // The terminal object should be never destroyed
  end() {
    if (typeof this.#observer !== 'undefined') {
      this.#observer.disconnect();
    }
    // $FlowFixMe
    window.removeEventListener('keydown', this.#onCoreKeyDown.bind(this));
    // $FlowFixMe
    window.removeEventListener('click', this.onCoreClick.bind(this));
    // $FlowFixMe
    window.removeEventListener('beforeunload', this.#onCoreBeforeUnload.bind(this), true);
    // $FlowFixMe
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

  async #wakeUp(): Promise<> {
    if (this.#wasLoaded) {
      if (!this.#wasStart) {
        await this.start();
        this.#wasStart = true;
        this.screen.flush();

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

  async execute(code: string, store: boolean = true, silent: boolean = false, isolated_frame: boolean = false): Promise<mixed> {
    if (!silent) {
      this.screen.printCommand(code);
    }
    this.screen.cleanInput();
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

    const call_ctx = {
      screen: new Proxy(this.screen, {...ScreenCommandHandler, silent: meta.silent}),
      meta: meta,
    };
    // $FlowIgnore
    return await meta.info.cmdDef.callback.call(this, meta.info.kwargs, call_ctx);
  }

  /* VISIBILIY */
  async doShow() {
    if (!this.#wasLoaded) {
      return;
    }
    // Only start the terminal if needed
    await this.#wakeUp();
    this.screen.show();
  }

  async doHide() {
    this.screen.hide();
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

  getContext(extra_context: ?{[string]: mixed}): {[string]: mixed} {
    return Object.assign({}, this.userContext, extra_context);
  }

  /* PRIVATE METHODS*/
  #storeUserInput(strInput: string) {
    if (this.#inputHistory.at(-1) === strInput) {
      return;
    }
    this.#inputHistory.push(strInput);
    setStorageSessionItem('terminal_history', this.#inputHistory, err => this.screen.printError(err, true));
    this.#searchHistoryIter = this.#inputHistory.length;
  }

  #isTerminalVisible(): boolean {
    return this.el.classList.contains('terminal-transition-topdown');
  }

  printWelcomeMessage() {
    this.screen.print(renderWelcome(this.VERSION));
  }

  #doSearchPrevHistory(): string | void {
    const orig_iter = this.#searchHistoryIter;
    const last_str = this.#inputHistory[this.#searchHistoryIter];
    this.#searchHistoryIter = this.#inputHistory.findLastIndex((item, i) => {
      if (this.#searchHistoryQuery) {
        return item !== last_str && item.indexOf(this.#searchHistoryQuery) === 0 && i <= this.#searchHistoryIter;
      }
      return i < this.#searchHistoryIter;
    });
    if (this.#searchHistoryIter === -1) {
      this.#searchHistoryIter = orig_iter;
      return undefined;
    }
    return this.#inputHistory[this.#searchHistoryIter];
  }

  #doSearchNextHistory(): string | void {
    const last_str = this.#inputHistory[this.#searchHistoryIter];
    this.#searchHistoryIter = this.#inputHistory.findIndex((item, i) => {
      if (this.#searchHistoryQuery) {
        return item !== last_str && item.indexOf(this.#searchHistoryQuery) === 0 && i >= this.#searchHistoryIter;
      }
      return i > this.#searchHistoryIter;
    });
    if (this.#searchHistoryIter === -1) {
      this.#searchHistoryIter = this.#inputHistory.length;
      return undefined;
    }
    return this.#inputHistory[this.#searchHistoryIter];
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
    } else {
      this.runningCmdCount_el.classList.add('hidden');
      this.runningCmdCount_el.textContent = '';
    }
  }

  #applySettings(config: TerminalOptions) {
    Object.assign(this.#config, config);
    this.#config.opacity *= 0.01;
    this.#config.term_context = this.#config.term_context || {};
    this.userContext = Object.assign({}, this.#config.term_context, this.userContext);
  }

  updateAssistantoptions() {
    this.#mutexAvailableOptions.cancel();
    this.#mutexAvailableOptions
      .runExclusive(async () => {
        const user_input = this.screen.getUserInput();
        if (typeof user_input === 'undefined' || user_input.length === 0) {
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
      Object.assign(this.#messageListeners, {[type]: []});
    }
    if (this.#messageListeners[type].filter(item => item.name === callback.name).length === 0) {
      this.#messageListeners[type].push(callback);
    }
  }
  removeMessageListener(type: string, callback: MessageListenerCallback) {
    if (!callback) {
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
    // $FlowFixMe
    const ev_data: Object = {...event.data};
    if (Object.hasOwn(this.#messageListeners, ev_data.type)) {
      this.#messageListeners[ev_data.type].forEach((callback: MessageListenerCallback) => callback.bind(this)(ev_data));
    }
  }

  #onTerminalToggle() {
    this.doToggle();
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
    this.#shell.getVM().cleanNames();
    this.#updateJobsInfo();
    this.updateAssistantoptions();
    this.printWelcomeMessage();
  }

  #onKeyEnter() {
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
    if (found_hist !== null && typeof found_hist !== 'undefined' && found_hist !== '') {
      this.screen.updateInput(found_hist);
    }
  }
  #onKeyArrowDown() {
    if (typeof this.#searchHistoryQuery === 'undefined') {
      this.#searchHistoryQuery = this.screen.getUserInput();
    }
    const found_hist = this.#doSearchNextHistory();
    if (found_hist !== null && typeof found_hist !== 'undefined' && found_hist !== '') {
      this.screen.updateInput(found_hist);
    } else {
      this.#searchHistoryQuery = '';
      this.screen.cleanInput();
    }
  }
  #onKeyArrowRight(ev: KeyboardEvent) {
    const user_input = this.screen.getUserInput();
    if (user_input && ev.target instanceof HTMLInputElement && ev.target.selectionStart === user_input.length) {
      this.#searchHistoryQuery = user_input;
      this.#searchHistoryIter = this.#inputHistory.length;
      this.#onKeyArrowUp();
      this.#searchHistoryQuery = user_input;
      this.#searchHistoryIter = this.#inputHistory.length;
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
    if (sel_cmd_index === null) {
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

  onCoreClick(ev: MouseEvent) {
    // Auto-Hide
    if (
      this.el &&
      ev.target instanceof HTMLElement &&
      !this.el.contains(ev.target) &&
      this.#isTerminalVisible() &&
      !this.#config.maximized &&
      !this.#config.pinned
    ) {
      this.doHide();
    } else if (ev.target instanceof HTMLElement && ev.target.classList.contains('o_terminal_cmd')) {
      // $FlowFixMe
      this.#onClickTerminalCommand(ev.target);
    }
  }
  #onCoreKeyDown(this: Terminal, ev: KeyboardEvent) {
    // Don't crash when press keys!
    try {
      if (ev.keyCode === 27 && isEmpty(this.screen.getQuestionActive())) {
        // Press Escape
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
