// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import processKeybind from '@common/utils/process_keybind';
import {KEYMAP} from '@trash/constants';
import UnknownCommandError from '@trash/exceptions/unknown_command_error';
import difference from '@trash/utils/difference';
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
import isEmpty from './utils/is_empty';

export default class Terminal {
  VERSION = '10.2.0';

  userContext = {};

  #config = {};
  #rawTerminalTemplate = renderTerminal();

  #registeredCmds = {};

  #inputHistory = [];
  #searchHistoryQuery = '';
  #searchHistoryIter = 0;

  #hasExecInitCmds = false;

  #jobs = [];
  #observer = null;
  #virtMachine = null;

  #commandAssistant = null;
  #assistantOptions = {};
  #selAssistanOption = -1;

  #messageListeners = {};

  #wasStart = false;
  #wasLoaded = false;

  constructor(config) {
    Object.assign(
      this.#config,
      {
        commandTimeout: 30000,
      },
      config,
    );

    this.screen = new Screen(
      {
        onSaveScreen: function (content) {
          debounce(
            setStorageSessionItem('terminal_screen', content, err =>
              this.screen.print(err),
            ),
            350,
          );
        }.bind(this),
        onCleanScreen: () => removeStorageSessionItem('terminal_screen'),
        onInputKeyUp: this.#onInputKeyUp.bind(this),
        onInput: this.#onInput.bind(this),
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

  init(settings) {
    this.#applySettings(settings);
    this.#wasLoaded = true;
    if (this.#config.pinned) {
      this.doShow();
      this.$el
        .find('.terminal-screen-icon-pin')
        .removeClass('btn-dark')
        .addClass('btn-light');
    }
    if (this.#config.maximized) {
      this.$el.addClass('term-maximized');
      this.$el
        .find('.terminal-screen-icon-maximize')
        .removeClass('btn-dark')
        .addClass('btn-light');
    }

    window.addEventListener('message', this.#onWindowMessage.bind(this), false);
    window.addEventListener('keydown', this.#onCoreKeyDown.bind(this));
    window.addEventListener('click', this.onCoreClick.bind(this));
    window.addEventListener(
      'beforeunload',
      this.#onCoreBeforeUnload.bind(this),
      true,
    );
    this.$el
      .find('.terminal-screen-icon-maximize')
      .on('click', this.#onClickToggleMaximize.bind(this));
    this.$el
      .find('.terminal-screen-icon-pin')
      .on('click', this.#onClickToggleScreenPin.bind(this));
    // Custom Events
    this.$el[0].addEventListener('toggle', this.doToggle.bind(this));

    if (!isEmpty(this.#config.init_cmds)) {
      this.#wakeUp();
    }
  }

  get registeredCmds() {
    return this.#registeredCmds;
  }

  get virtMachine() {
    return this.#virtMachine;
  }

  get jobs() {
    return this.#jobs;
  }

  get config() {
    return this.#config;
  }

  get messageListeners() {
    return this.#messageListeners;
  }

  /**
   * This is necessary to prevent terminal issues in Odoo EE
   */
  #initGuard() {
    if (this.#observer === null) {
      this.#observer = new MutationObserver(this.#injectTerminal.bind(this));
      this.#observer.observe(document.body, {childList: true});
    }
  }

  #injectTerminal() {
    const $terms = $('body').children('.o_terminal');
    if ($terms.length > 1) {
      // Remove extra terminals
      $terms.filter(':not(:first-child)').remove();
    } else if ($terms.length === 0) {
      this.$el = $(this.#rawTerminalTemplate);
      this.$el.prependTo('body');
    }
  }

  async start() {
    if (!this.#wasLoaded) {
      throw new Error('Terminal not loaded');
    }

    this.$runningCmdCount = this.$el.find('#terminal_running_cmd_count');
    this.#virtMachine = new VMachine(this.#registeredCmds, {
      processCommandJob: this.#processCommandJob.bind(this),
    });
    this.#commandAssistant = new CommandAssistant(this.#virtMachine);
    this.screen.start(this.$el);
    this.screen.applyStyle('opacity', this.#config.opacity);
    this.onStart();
  }

  // The terminal object should be never destroyed
  end() {
    if (typeof this.#observer !== 'undefined') {
      this.#observer.disconnect();
    }
    window.removeEventListener('keydown', this.#onCoreKeyDown.bind(this));
    window.removeEventListener('click', this.onCoreClick.bind(this));
    window.removeEventListener(
      'beforeunload',
      this.#onCoreBeforeUnload.bind(this),
      true,
    );
    this.$el[0].removeEventListener('toggle', this.doToggle.bind(this));
  }

  /* BASIC FUNCTIONS */
  cleanInputHistory() {
    this.#inputHistory = [];
    removeStorageSessionItem('terminal_screen');
  }

  registerCommand(cmd, cmd_def) {
    this.#registeredCmds[cmd] = Object.assign(
      {
        definition: 'Undefined command',
        callback: this.#fallbackExecuteCommand,
        services: [],
        detail: "This command hasn't a properly detailed information",
        args: [],
        secured: false,
        aliases: [],
        example: '',
      },
      cmd_def,
    );
  }

  validateCommand(cmd) {
    if (!cmd) {
      return [false, false];
    }
    const cmd_split = cmd.split(' ');
    const cmd_name = cmd_split[0];
    if (!cmd_name) {
      return [cmd, false];
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
  searchSimiliarCommand(in_cmd) {
    if (in_cmd.length < 3) {
      return false;
    }

    // Only consider words with score lower than this limit
    const SCORE_LIMIT = 50;
    // Columns per Key and Rows per Key
    const cpk = 10,
      rpk = 3;
    const max_dist = Math.sqrt(cpk + rpk);
    const _get_key_dist = function (from, to) {
      const _get_key_pos2d = function (key) {
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
    const sorted_cmd_keys = Object.keys(this.#registeredCmds).sort();
    const min_score = [0, ''];
    const sorted_keys_len = sorted_cmd_keys.length;
    for (let x = 0; x < sorted_keys_len; ++x) {
      const cmd = sorted_cmd_keys[x];
      // Analize typo's
      const search_index = sanitized_in_cmd.search(cmd);
      let cmd_score = 0;
      if (search_index === -1) {
        // Penalize word length diff
        cmd_score =
          Math.abs(sanitized_in_cmd.length - cmd.length) / 2 + max_dist;
        // Analize letter key distances
        for (let i = 0; i < sanitized_in_cmd.length; ++i) {
          if (i < cmd.length) {
            const score = _get_key_dist(
              sanitized_in_cmd.charAt(i),
              cmd.charAt(i),
            );
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

    return min_score[0] < SCORE_LIMIT ? min_score[1] : false;
  }

  parse(data, options, level = 0) {
    return this.#virtMachine.parse(data, options, level);
  }

  eval(code, options) {
    return this.#virtMachine.eval(
      code,
      Object.assign({}, options, {
        aliases: getStorageLocalItem('terminal_aliases', {}),
      }),
    );
  }

  async execute(code, store = true, silent = false) {
    await this.#wakeUp();

    // Check if secured commands involved
    if (!silent) {
      this.screen.printCommand(code);
    }
    this.screen.cleanInput();
    if (store) {
      this.#storeUserInput(code);
    }
    const cmd_res = [];
    try {
      const results = await this.eval(code, {
        silent: silent,
      });
      for (const result of results) {
        cmd_res.push(result);
      }
    } catch (err) {
      let err_msg = `${err.name}: ${err.message}`;
      if (err.constructor === UnknownCommandError) {
        // Search similar commands
        const similar_cmd = this.searchSimiliarCommand(err.cmd_name);
        if (similar_cmd) {
          err_msg = renderUnknownCommand({
            org_cmd: err.cmd_name,
            cmd: similar_cmd,
            pos: [err.start, err.end],
          });
        }
      }
      this.screen.printError(err_msg);
      if (this.#config.console_errors) {
        console.error(err);
      }
      throw err;
    }

    if (cmd_res.length === 1) {
      return cmd_res[0];
    }
    return cmd_res;
  }

  async #wakeUp() {
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
      throw new Error('Terminal not loaded');
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

  doToggle() {
    if (this.#isTerminalVisible()) {
      return this.doHide();
    }

    return this.doShow();
  }

  createTerminal() {
    this.#injectTerminal();
    this.#initGuard();
  }

  getContext(extra_context) {
    return Object.assign({}, this.userContext, extra_context);
  }

  /* PRIVATE METHODS*/
  #storeUserInput(strInput) {
    if (this.#inputHistory.at(-1) === strInput) {
      return;
    }
    this.#inputHistory.push(strInput);
    setStorageSessionItem('terminal_history', this.#inputHistory, err =>
      this.screen.printError(err, true),
    );
    this.#searchHistoryIter = this.#inputHistory.length;
  }

  #isTerminalVisible() {
    return this.$el && parseInt(this.$el.css('top'), 10) >= 0;
  }

  printWelcomeMessage() {
    this.screen.print(renderWelcome({ver: this.VERSION}));
  }

  #doSearchPrevHistory() {
    const orig_iter = this.#searchHistoryIter;
    const last_str = this.#inputHistory[this.#searchHistoryIter];
    this.#searchHistoryIter = this.#inputHistory.findLastIndex((item, i) => {
      if (this.#searchHistoryQuery) {
        return (
          item !== last_str &&
          item.indexOf(this.#searchHistoryQuery) === 0 &&
          i <= this.#searchHistoryIter
        );
      }
      return i < this.#searchHistoryIter;
    });
    if (this.#searchHistoryIter === -1) {
      this.#searchHistoryIter = orig_iter;
      return false;
    }
    return this.#inputHistory[this.#searchHistoryIter];
  }

  #doSearchNextHistory() {
    const last_str = this.#inputHistory[this.#searchHistoryIter];
    this.#searchHistoryIter = this.#inputHistory.findIndex((item, i) => {
      if (this.#searchHistoryQuery) {
        return (
          item !== last_str &&
          item.indexOf(this.#searchHistoryQuery) === 0 &&
          i >= this.#searchHistoryIter
        );
      }
      return i > this.#searchHistoryIter;
    });
    if (this.#searchHistoryIter === -1) {
      this.#searchHistoryIter = this.#inputHistory.length;
      return false;
    }
    return this.#inputHistory[this.#searchHistoryIter];
  }

  async #fallbackExecuteCommand() {
    throw new Error('Invalid command definition!');
  }

  #updateJobsInfo() {
    if (!this.#wasStart) {
      return;
    }
    const count = this.#jobs.filter(Object).length;
    if (count) {
      const count_unhealthy = this.#jobs.filter(item => !item.healthy).length;
      let str_info = `Running ${count} command(s)`;
      if (count_unhealthy) {
        str_info += ` (${count_unhealthy} unhealthy)`;
      }
      str_info += '...';
      this.$runningCmdCount.html(str_info).show();
    } else {
      this.$runningCmdCount.fadeOut('fast', function () {
        $(this).html('');
      });
    }
  }

  #applySettings(config) {
    Object.assign(this.#config, {
      pinned: getStorageSessionItem('terminal_pinned', config.pinned),
      maximized: getStorageSessionItem('screen_maximized', config.maximized),
      opacity: config.opacity * 0.01,
      shortcuts: config.shortcuts,
      term_context: config.term_context || {},
      init_cmds: config.init_cmds,
      console_errors: config.devmode_console_errors,
    });

    this.userContext = Object.assign(
      {},
      this.#config.term_context,
      this.userContext,
    );
  }

  getCommandJobMeta(command_info, job_index, silent = false) {
    return {
      name: command_info.cmdName,
      cmdRaw: command_info.cmdRaw,
      def: command_info.cmdDef,
      jobIndex: job_index,
      silent: silent,
    };
  }

  async #processCommandJob(command_info, silent = false) {
    const job_index = this.onStartCommand(command_info);
    if (job_index === -1) {
      throw new Error("Unexpected error: can't initialize the job!");
    }
    let result = false;
    let error = false;
    let is_failed = false;
    const meta = this.getCommandJobMeta(command_info, job_index, silent);
    try {
      const cmdScreen = new Proxy(
        this.screen,
        Object.assign({}, ScreenCommandHandler, {silent: silent}),
      );
      result =
        (await command_info.cmdDef.callback.call(
          this,
          command_info.kwargs,
          cmdScreen,
          meta,
        )) || true;
    } catch (err) {
      is_failed = true;
      error =
        err || '[!] Oops! Unknown error! (no detailed error message given :/)';
    } finally {
      this.onFinishCommand(job_index, is_failed, error || result);
    }
    if (is_failed) {
      throw new Error(typeof error === 'object' ? '' : error);
    }
    return result;
  }

  /* HANDLE EVENTS */
  onStart() {
    // Override me
  }

  onStartCommand(command_info) {
    const job_info = {
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
  onTimeoutCommand(job_index) {
    this.#jobs[job_index].healthy = false;
    this.#updateJobsInfo();
  }
  onFinishCommand(job_index, has_errors, result) {
    const job_info = this.#jobs[job_index];
    clearTimeout(job_info.timeout);
    if (has_errors) {
      this.screen.printError(`Error executing '${job_info.cmdInfo.cmdName}':`);
      if (
        typeof result === 'object' &&
        !Object.hasOwn(result, 'data') &&
        Object.hasOwn(result, 'message')
      ) {
        this.screen.printError(result.message, true);
      }
    }
    delete this.#jobs[job_index];
    this.#updateJobsInfo();
  }

  addMessageListener(type, callback) {
    if (!Object.hasOwn(this.#messageListeners, type)) {
      Object.assign(this.#messageListeners, {[type]: []});
    }
    if (
      this.#messageListeners[type].filter(item => item.name === callback.name)
        .length === 0
    ) {
      this.#messageListeners[type].push(callback);
    }
  }
  removeMessageListener(type, callback) {
    if (!callback) {
      delete this.#messageListeners[type];
    } else {
      this.#messageListeners[type] = this.#messageListeners[type].filter(
        item => item.name !== callback.name,
      );
    }
  }
  #onWindowMessage(ev) {
    // We only accept messages from ourselves
    if (ev.source !== window) {
      return;
    }
    if (Object.hasOwn(this.messageListeners, ev.data.type)) {
      this.messageListeners[ev.data.type].forEach(callback =>
        callback.bind(this)(ev.data),
      );
    }
  }

  #onClickTerminalCommand(target) {
    if (Object.hasOwn(target.dataset, 'cmd')) {
      this.execute(target.dataset.cmd).catch(() => {
        // Do nothing
      });
    }
  }

  #onClickToggleMaximize(ev) {
    const $target = $(ev.currentTarget);
    this.#config.maximized = !this.#config.maximized;
    if (this.#config.maximized) {
      this.$el.addClass('term-maximized');
      $target.removeClass('btn-dark').addClass('btn-light');
    } else {
      this.$el.removeClass('term-maximized');
      $target.removeClass('btn-light').addClass('btn-dark');
    }
    setStorageSessionItem('screen_maximized', this.#config.maximized, err =>
      this.screen.print(err),
    );
    this.screen.scrollDown();
    this.screen.preventLostInputFocus();
  }

  #onClickToggleScreenPin(ev) {
    const $target = $(ev.currentTarget);
    this.#config.pinned = !this.#config.pinned;
    setStorageSessionItem('terminal_pinned', this.#config.pinned, err =>
      this.screen.print(err),
    );
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
    this.#searchHistoryQuery = undefined;
    this.screen.preventLostInputFocus();
  }
  #onKeyArrowUp() {
    if (typeof this.#searchHistoryQuery === 'undefined') {
      this.#searchHistoryQuery = this.screen.getUserInput();
    }
    const found_hist = this.#doSearchPrevHistory();
    if (found_hist) {
      this.screen.updateInput(found_hist);
    }
  }
  #onKeyArrowDown() {
    if (typeof this.#searchHistoryQuery === 'undefined') {
      this.#searchHistoryQuery = this.screen.getUserInput();
    }
    const found_hist = this.#doSearchNextHistory();
    if (found_hist) {
      this.screen.updateInput(found_hist);
    } else {
      this.#searchHistoryQuery = undefined;
      this.screen.cleanInput();
    }
  }
  #onKeyArrowRight(ev) {
    let user_input = this.screen.getUserInput();
    if (user_input && ev.target.selectionStart === user_input.length) {
      this.#searchHistoryQuery = user_input;
      this.#searchHistoryIter = this.#inputHistory.length;
      this.#onKeyArrowUp();
      this.#searchHistoryQuery = user_input;
      this.#searchHistoryIter = this.#inputHistory.length;
    }
    user_input = this.screen.getUserInput();

    this.#commandAssistant.lazyGetAvailableOptions(
      user_input,
      this.screen.getInputCaretStartPos(),
      options => {
        this.#assistantOptions = options;
        this.#selAssistanOption = -1;
        this.screen.updateAssistantPanelOptions(
          this.#assistantOptions,
          this.#selAssistanOption,
        );
      },
    );
  }
  #onKeyArrowLeft() {
    const user_input = this.screen.getUserInput();
    this.#commandAssistant.lazyGetAvailableOptions(
      user_input,
      this.screen.getInputCaretStartPos(),
      options => {
        this.#assistantOptions = options;
        this.#selAssistanOption = -1;
        this.screen.updateAssistantPanelOptions(
          this.#assistantOptions,
          this.#selAssistanOption,
        );
      },
    );
  }
  #onKeyTab() {
    const user_input = this.screen.getUserInput();
    if (isEmpty(user_input)) {
      return;
    }

    const parse_info = this.parse(user_input);
    const [sel_cmd_index, sel_token_index] =
      this.#commandAssistant.getSelectedParameterIndex(
        parse_info,
        this.screen.getInputCaretStartPos(),
      );
    if (sel_cmd_index === null) {
      return;
    }
    const cur_token = parse_info.inputTokens[0][sel_token_index];
    ++this.#selAssistanOption;
    if (this.#selAssistanOption >= this.#assistantOptions.length) {
      this.#selAssistanOption = 0;
    }
    const option = this.#assistantOptions[this.#selAssistanOption];
    if (isEmpty(option)) {
      return;
    }

    let res_str = `${parse_info.inputRawString.substr(0, cur_token.start)}${
      option.string
    }`;
    const n_caret_pos = res_str.length;
    res_str += parse_info.inputRawString.substr(cur_token.end);
    if (!isEmpty(res_str)) {
      this.screen.updateInput(res_str);
    }
    if (n_caret_pos !== -1) {
      this.screen.setInputCaretPos(n_caret_pos);
    }
    this.screen.updateAssistantPanelOptions(
      this.#assistantOptions,
      this.#selAssistanOption,
    );
  }

  #onInput() {
    // Fish-like feature
    const user_input = this.screen.getUserInput();
    this.#commandAssistant.lazyGetAvailableOptions(
      user_input,
      this.screen.getInputCaretStartPos(),
      options => {
        this.#assistantOptions = options;
        this.#selAssistanOption = -1;
        this.screen.updateAssistantPanelOptions(
          this.#assistantOptions,
          this.#selAssistanOption,
        );
      },
    );
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

  #onInputKeyUp(ev) {
    const question_active = this.screen.getQuestionActive();
    if (isEmpty(question_active)) {
      if (ev.keyCode === $.ui.keyCode.ENTER) {
        this.#onKeyEnter(ev);
      } else if (ev.keyCode === $.ui.keyCode.UP) {
        this.#onKeyArrowUp(ev);
      } else if (ev.keyCode === $.ui.keyCode.DOWN) {
        this.#onKeyArrowDown(ev);
      } else if (ev.keyCode === $.ui.keyCode.RIGHT) {
        this.#onKeyArrowRight(ev);
      } else if (ev.keyCode === $.ui.keyCode.LEFT) {
        this.#onKeyArrowLeft(ev);
      } else if (ev.keyCode === $.ui.keyCode.TAB) {
        this.#onKeyTab(ev);
      } else {
        this.#searchHistoryIter = this.#inputHistory.length;
        this.#searchHistoryQuery = undefined;
      }
    } else if (ev.keyCode === $.ui.keyCode.ENTER) {
      this.screen.responseQuestion(question_active, ev.target.value);
    } else if (ev.keyCode === $.ui.keyCode.ESCAPE) {
      this.screen.rejectQuestion(question_active, 'Operation aborted');
      ev.preventDefault();
    }
  }

  onCoreClick(ev) {
    // Auto-Hide
    if (
      this.$el &&
      !this.$el[0].contains(ev.target) &&
      this.#isTerminalVisible() &&
      !this.#config.maximized &&
      !this.#config.pinned
    ) {
      this.doHide();
    } else if (ev.target.classList.contains('o_terminal_cmd')) {
      this.#onClickTerminalCommand(ev.target);
    }
  }
  #onCoreKeyDown(ev) {
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
  #onCoreBeforeUnload(ev) {
    const jobs = this.#jobs.filter(item => item);
    if (jobs.length) {
      if (
        jobs.length === 1 &&
        (!jobs[0] ||
          ['reload', 'login'].indexOf(jobs[0].cmdInfo.cmdName) !== -1)
      ) {
        return;
      }
      ev.preventDefault();
      ev.returnValue = '';
      this.screen.print(
        'The terminal has prevented the current tab from closing due to unfinished tasks:',
      );
      this.screen.print(
        jobs.map(
          item =>
            `${item.cmdInfo.cmdName} <small><i>${item.cmdInfo.cmdRaw}</i></small>`,
        ),
      );
      this.doShow();
    }
  }
}
