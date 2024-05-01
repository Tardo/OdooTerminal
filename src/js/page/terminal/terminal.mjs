// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import logger from '@common/logger';
import processKeybind from '@common/utils/process_keybind';
import {SETTING_DEFAULTS} from '@common/constants';
import {KEYMAP} from '@trash/constants';
import UnknownCommandError from '@trash/exceptions/unknown_command_error';
import difference from '@trash/utils/difference';
import isEmpty from '@trash/utils/is_empty';
import VMachine from '@trash/vmachine';
import CommandAssistant from './core/command_assistant';
import {default as Screen, ScreenCommandHandler} from './core/screen';
import {getStorageItem as getStorageLocalItem} from './core/storage/local';
import {
  getStorageItem as getStorageSessionItem,
  removeStorageItem as removeStorageSessionItem,
  setStorageItem as setStorageSessionItem,
} from './core/storage/session';
import renderTerminal from './templates/terminal';
import renderUnknownCommand from './templates/unknown_command';
import renderWelcome from './templates/welcome';
import debounce from './utils/debounce';
import keyCode from './utils/keycode';
import ProcessJobError from './exceptions/process_job_error';
// $FlowIgnore
import {Mutex} from 'async-mutex';
import type {ExtensionSettings} from '@common/constants';
import type {CMDDef, ParserOptions, ParseInfo} from '@trash/interpreter';
import type {EvalOptions, ProcessCommandJobOptions} from '@trash/vmachine';
import type {CMDAssistantOption} from './core/command_assistant';

export type TerminalOptions = {
  commandTimeout: number,
  ...ExtensionSettings,
};

export type JobInfo = {
  cmdInfo: ProcessCommandJobOptions,
  healthy: boolean,
  timeout?: TimeoutID,
};

export type JobMetaInfo = {
  name: string,
  cmdRaw: string,
  def: CMDDef,
  jobIndex: number,
  silent: boolean,
};

//
export type MessageListenerCallback = (data: {[string]: mixed}) => Promise<mixed>;

export default class Terminal {
  VERSION = '10.4.2';

  userContext: {[string]: mixed} = {};

  screen: Screen;
  // $FlowFixMe
  $el: Object;
  // $FlowFixMe
  $runningCmdCount: Object;

  registeredCmds: {[string]: CMDDef} = {};
  virtMachine: VMachine;

  #config: TerminalOptions = {...SETTING_DEFAULTS, commandTimeout: 30000};
  #jobs: Array<JobInfo> = [];

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

  // $FlowFixMe
  #mutexAvailableOptions: Object = new Mutex();

  constructor() {
    this.screen = new Screen(
      {
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
      },
      {
        username: 'Unregistered User',
        host: window.location.host,
      },
    );

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
      this.$el.find('.terminal-screen-icon-pin').removeClass('btn-dark').addClass('btn-light');
    }
    if (this.#config.maximized) {
      this.$el.addClass('term-maximized');
      this.$el.find('.terminal-screen-icon-maximize').removeClass('btn-dark').addClass('btn-light');
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
    this.$el.find('.terminal-screen-icon-maximize').on('click', this.#onClickToggleMaximize.bind(this));
    // $FlowFixMe
    this.$el.find('.terminal-screen-icon-pin').on('click', this.#onClickToggleScreenPin.bind(this));
    // Custom Events
    // $FlowFixMe
    this.$el[0].addEventListener('toggle', this.doToggle.bind(this));

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

  #injectTerminal() {
    // $FlowFixMe
    const $terms = $('body').children('.o_terminal');
    if ($terms.length > 1) {
      // Remove extra terminals
      $terms.filter(':not(:first-child)').remove();
    } else if ($terms.length === 0) {
      this.$el = $(this.#rawTerminalTemplate);
      this.$el.prependTo('body');
    }
  }

  start(): void {
    if (!this.#wasLoaded) {
      throw new Error('Terminal not loaded');
    }

    this.$runningCmdCount = this.$el.find('#terminal_running_cmd_count');
    this.virtMachine = new VMachine(this.registeredCmds, {
      processCommandJob: (cmdInfo, silent) => this.#processCommandJob(cmdInfo, silent),
      silent: false,
    });
    this.#commandAssistant = new CommandAssistant(this);
    this.screen.start(this.$el);
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
    this.$el[0].removeEventListener('toggle', this.doToggle.bind(this));
  }

  /* BASIC FUNCTIONS */
  getActiveJobs(): $ReadOnlyArray<JobInfo> {
    return this.#jobs.filter(item => item);
  }

  cleanInputHistory() {
    this.#inputHistory = [];
    removeStorageSessionItem('terminal_screen');
  }

  registerCommand(cmd: string, cmd_def: Partial<CMDDef>) {
    this.registeredCmds[cmd] = {
      definition: i18n.t('terminal.cmd.default.definition', 'Undefined command'),
      callback: () => {
        return this.#fallbackExecuteCommand();
      },
      options: () => {
        return this.#fallbackCommandOptions();
      },
      detail: i18n.t('terminal.cmd.default.detail', "This command hasn't a properly detailed information"),
      args: [],
      secured: false,
      aliases: [],
      example: '',
      ...cmd_def,
    };
  }

  validateCommand(cmd: string): [?string, ?string] {
    if (!cmd) {
      return [undefined, undefined];
    }
    const cmd_split = cmd.split(' ');
    const cmd_name = cmd_split[0];
    if (!cmd_name) {
      return [cmd, undefined];
    }
    return [cmd, cmd_name];
  }

  // Key Distance Comparison (Simple mode)
  // Comparison by distance between keys.
  //
  // This mode of analysis limit it to qwerty layouts
  // but can predict words with a better accuracy.
  // Example Case:
  //   - Two commands: horse, house
  //   - User input: hoese
  //
  //   - Output using simple comparison: horse and house (both have the
  //     same weight)
  //   - Output using KDC: horse
  searchSimiliarCommand(in_cmd: string): string | void {
    if (in_cmd.length < 3) {
      return undefined;
    }

    // Only consider words with score lower than this limit
    const SCORE_LIMIT = 50;
    // Columns per Key and Rows per Key
    const cpk = 10,
      rpk = 3;
    const max_dist = Math.sqrt(cpk + rpk);
    const _get_key_dist = function (from: string, to: string) {
      const _get_key_pos2d = function (key: string) {
        const i = KEYMAP.indexOf(key);
        if (i === -1) {
          return [cpk, rpk];
        }
        return [i / cpk, i % rpk];
      };

      const from_pos = _get_key_pos2d(from);
      const to_pos = _get_key_pos2d(to);
      const x = (to_pos[0] - from_pos[0]) * (to_pos[0] - from_pos[0]);
      const y = (to_pos[1] - from_pos[1]) * (to_pos[1] - from_pos[1]);
      return Math.sqrt(x + y);
    };

    const sanitized_in_cmd = in_cmd.toLowerCase();
    const sorted_cmd_keys = Object.keys(this.registeredCmds).sort();
    const min_score = [0, ''];
    const sorted_keys_len = sorted_cmd_keys.length;
    for (let x = 0; x < sorted_keys_len; ++x) {
      const cmd = sorted_cmd_keys[x];
      // Analize typo's
      const search_index = sanitized_in_cmd.search(cmd);
      let cmd_score = 0;
      if (search_index === -1) {
        // Penalize word length diff
        cmd_score = Math.abs(sanitized_in_cmd.length - cmd.length) / 2 + max_dist;
        // Analize letter key distances
        for (let i = 0; i < sanitized_in_cmd.length; ++i) {
          if (i < cmd.length) {
            const score = _get_key_dist(sanitized_in_cmd.charAt(i), cmd.charAt(i));
            if (score === 0) {
              --cmd_score;
            } else {
              cmd_score += score;
            }
          } else {
            break;
          }
        }
        // Using all letters?
        const cmd_vec = cmd.split('').map(k => k.charCodeAt(0));
        const in_cmd_vec = sanitized_in_cmd.split('').map(k => k.charCodeAt(0));
        if (difference(in_cmd_vec, cmd_vec).length === 0) {
          cmd_score -= max_dist;
        }
      } else {
        cmd_score = Math.abs(sanitized_in_cmd.length - cmd.length) / 2;
      }

      // Search lower score
      // if zero = perfect match (this never should happens)
      if (min_score[1] === '' || cmd_score < min_score[0]) {
        min_score[0] = cmd_score;
        min_score[1] = cmd;
        if (min_score[0] === 0.0) {
          break;
        }
      }
    }

    return min_score[0] < SCORE_LIMIT ? min_score[1] : undefined;
  }

  parse(data: string, options?: ParserOptions, level?: number = 0): ParseInfo {
    return this.virtMachine.parse(data, options, level);
  }

  eval(code: string, options?: Partial<EvalOptions>): Promise<$ReadOnlyArray<mixed>> {
    return this.virtMachine.eval(code, {
      ...options,
      aliases: getStorageLocalItem('terminal_aliases', {}),
    });
  }

  async execute(code: string, store: boolean = true, silent: boolean = false): Promise<$ReadOnlyArray<mixed>> {
    await this.#wakeUp();

    // Check if secured commands involved
    if (!silent) {
      this.screen.printCommand(code);
    }
    this.screen.cleanInput();
    if (store) {
      this.#storeUserInput(code);
    }
    const cmd_res: Array<mixed> = [];
    try {
      const results = await this.eval(code, {
        silent: silent,
      });
      for (const result of results) {
        cmd_res.push(result);
      }
    } catch (err) {
      this.screen.printError(`${err.name}: ${err.message}`);
      let err_msg = err.data;
      if (err.constructor === UnknownCommandError) {
        // Search similar commands
        const similar_cmd = this.searchSimiliarCommand(err.cmd_name);
        if (typeof similar_cmd !== 'undefined') {
          err_msg = renderUnknownCommand(err.cmd_name, [err.start, err.end], similar_cmd);
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

  /* VISIBILIY */
  async doShow() {
    if (!this.#wasLoaded) {
      return;
    }
    // Only start the terminal if needed
    await this.#wakeUp();
    this.$el.addClass('terminal-transition-topdown');
    this.screen.focus();
  }

  async doHide() {
    this.$el.removeClass('terminal-transition-topdown');
  }

  doToggle(): Promise<> {
    if (this.#isTerminalVisible()) {
      return this.doHide();
    }

    return this.doShow();
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
    return this.$el && parseInt(this.$el.css('top'), 10) >= 0;
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

  async #fallbackExecuteCommand(): Promise<> {
    throw new Error(i18n.t('terminal.cmd.error.invalidDefinition', 'Invalid command definition!'));
  }

  async #fallbackCommandOptions(): Promise<$ReadOnlyArray<string>> {
    return [];
  }

  #updateJobsInfo() {
    if (!this.#wasStart) {
      return;
    }
    const count = this.#jobs.filter(Object).length;
    if (count) {
      const count_unhealthy = this.#jobs.filter(item => !item.healthy).length;
      let str_info = i18n.t('terminal.info.job.running', 'Running {{count}} command(s)', {count});
      if (count_unhealthy) {
        str_info += i18n.t('terminal.info.job.unhealthy', ' ({{count_unhealthy}} unhealthy)', {count: count_unhealthy});
      }
      str_info += '...';
      this.$runningCmdCount.html(str_info).show();
    } else {
      this.$runningCmdCount.fadeOut('fast', function (this: HTMLElement) {
        // $FlowFixMe
        $(this).html('');
      });
    }
  }

  #applySettings(config: TerminalOptions) {
    Object.assign(this.#config, {
      pinned: getStorageSessionItem('terminal_pinned', config.pinned),
      maximized: getStorageSessionItem('screen_maximized', config.maximized),
      opacity: config.opacity * 0.01,
      shortcuts: config.shortcuts,
      term_context: config.term_context || {},
      init_cmds: config.init_cmds,
      devmode_console_errors: config.devmode_console_errors,
      cmd_assistant_dyn_options_disabled: config.cmd_assistant_dyn_options_disabled,
      cmd_assistant_match_mode: config.cmd_assistant_match_mode,
      cmd_assistant_max_results: config.cmd_assistant_max_results,
    });

    this.userContext = Object.assign({}, this.#config.term_context, this.userContext);
  }

  getCommandJobMeta(command_info: ProcessCommandJobOptions, job_index: number, silent: boolean = false): JobMetaInfo {
    return {
      name: command_info.cmdName,
      cmdRaw: command_info.cmdRaw,
      def: command_info.cmdDef,
      jobIndex: job_index,
      silent: silent,
    };
  }

  async #processCommandJob(command_info: ProcessCommandJobOptions, silent: boolean = false): Promise<mixed> {
    const job_index = this.onStartCommand(command_info);
    if (job_index === -1) {
      throw new Error(i18n.t('terminal.error.notInitJob', "Unexpected error: can't initialize the job!"));
    }
    let result: mixed;
    let error = '';
    let is_failed = false;
    const meta = this.getCommandJobMeta(command_info, job_index, silent);
    try {
      const call_ctx = {
        screen: new Proxy(this.screen, {...ScreenCommandHandler, silent: silent}),
        meta: meta,
      };
      result = await command_info.cmdDef.callback.call(this, command_info.kwargs, call_ctx);
    } catch (err) {
      is_failed = true;
      error =
        err?.message ||
        i18n.t('terminal.error.unknown', '[!] Oops! Unknown error! (no detailed error message given :/)');
    } finally {
      this.onFinishCommand(job_index);
    }
    if (is_failed) {
      throw new ProcessJobError(command_info.cmdName, error);
    }
    return result;
  }

  updateAssistantoptions() {
    this.#mutexAvailableOptions.cancel();
    this.#mutexAvailableOptions
      .runExclusive(async () => {
        const user_input = this.screen.getUserInput();
        if (typeof user_input === 'undefined') {
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

  onStartCommand(command_info: ProcessCommandJobOptions): number {
    const job_info: JobInfo = {
      cmdInfo: command_info,
      healthy: true,
    };
    // Add new job on a empty space or new one
    let index = this.#jobs.findIndex(item => {
      return typeof item === 'undefined';
    });
    if (index === -1) {
      index = this.#jobs.push(job_info) - 1;
    } else {
      this.#jobs[index] = job_info;
    }
    job_info.timeout = setTimeout(() => {
      this.onTimeoutCommand(index);
    }, this.#config.commandTimeout);
    this.#updateJobsInfo();
    return index;
  }
  onTimeoutCommand(job_index: number) {
    this.#jobs[job_index].healthy = false;
    this.#updateJobsInfo();
  }
  onFinishCommand(job_index: number) {
    const job_info = this.#jobs[job_index];
    clearTimeout(job_info.timeout);
    delete this.#jobs[job_index];
    this.#updateJobsInfo();
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

  #onClickTerminalCommand(target: HTMLElement) {
    if (Object.hasOwn(target.dataset, 'cmd')) {
      this.execute(target.dataset.cmd).catch(() => {
        // Do nothing
      });
    }
  }

  #onClickToggleMaximize(ev: MouseEvent) {
    // $FlowFixMe
    const $target = $(ev.currentTarget);
    this.#config.maximized = !this.#config.maximized;
    if (this.#config.maximized) {
      this.$el.addClass('term-maximized');
      $target.removeClass('btn-dark').addClass('btn-light');
    } else {
      this.$el.removeClass('term-maximized');
      $target.removeClass('btn-light').addClass('btn-dark');
    }
    setStorageSessionItem('screen_maximized', this.#config.maximized, err => this.screen.print(err));
    this.screen.scrollDown();
    this.screen.preventLostInputFocus();
  }

  #onClickToggleScreenPin(ev: MouseEvent) {
    // $FlowFixMe
    const $target = $(ev.currentTarget);
    this.#config.pinned = !this.#config.pinned;
    setStorageSessionItem('terminal_pinned', this.#config.pinned, err => this.screen.print(err));
    if (this.#config.pinned) {
      $target.removeClass('btn-dark').addClass('btn-light');
    } else {
      $target.removeClass('btn-light').addClass('btn-dark');
    }
    this.screen.preventLostInputFocus();
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
    const parse_info = this.parse(user_input);
    const [sel_cmd_index, sel_token_index] = this.#commandAssistant.getSelectedParameterIndex(
      parse_info,
      this.screen.getInputCaretStartPos(),
    );
    if (sel_cmd_index === null) {
      return;
    }
    const cur_token = parse_info.inputTokens[0][sel_token_index];
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

  #onInputKeyUp(ev: KeyboardEvent) {
    const question_active = this.screen.getQuestionActive();
    if (typeof question_active === 'undefined') {
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
    } else if (ev.keyCode === keyCode.ENTER) {
      this.screen.responseQuestion(question_active, ev.target instanceof HTMLInputElement ? ev.target.value : '');
    } else if (ev.keyCode === keyCode.ESCAPE) {
      this.screen.rejectQuestion(question_active, i18n.t('terminal.question.aborted', 'Operation aborted'));
      ev.preventDefault();
    }
  }

  onCoreClick(ev: MouseEvent) {
    // Auto-Hide
    if (
      this.$el &&
      !this.$el[0].contains(ev.target) &&
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
    } catch (err) {
      // Do nothing
    }
  }
  #onCoreBeforeUnload(ev: BeforeUnloadEvent) {
    const jobs = this.#jobs.filter(item => item);
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
