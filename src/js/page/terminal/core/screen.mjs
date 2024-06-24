// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import renderErrorMessage from '@terminal/templates/error_message';
import renderHelpCmd from '@terminal/templates/help_command';
import renderPromptCmd from '@terminal/templates/prompt_command';
import renderPromptCmdHiddenArgs from '@terminal/templates/prompt_command_hidden_args';
import renderScreen from '@terminal/templates/screen';
import renderAssistantPanel from '@terminal/templates/screen_assistant_panel';
import renderAssistantArgOptionItem from '@terminal/templates/screen_assistant_panel_arg_option_item';
import renderAssistantArgOptionList from '@terminal/templates/screen_assistant_panel_arg_option_list';
import renderLine from '@terminal/templates/screen_line';
import renderTable from '@terminal/templates/screen_table';
import renderUserInput from '@terminal/templates/screen_user_input';
import debounce from '@terminal/utils/debounce';
import defer from '@terminal/utils/defer';
import encodeHTML from '@terminal/utils/encode_html';
import genColorFromString from '@terminal/utils/gen_color_from_string';
import hsv2rgb from '@terminal/utils/hsv2rgb';
import rgb2hsv from '@terminal/utils/rgb2hsv';
import type {CMDAssistantOption} from './command_assistant';
import type {DebounceInnerCallback} from '@terminal/utils/debounce';
import type {CMDDef, TokenInfo} from '@trash/interpreter';

export type InputInfo = {
  username: string,
  version: string,
  host: string,
};

export type InputMode = 'single' | 'multi';

export type Question = {
  question: string,
  values: $ReadOnlyArray<string>,
  def_value: string | number,
  // $FlowFixMe
  defer: Object,
};

export type OnCleanScreenCallback = (content: string) => void;
export type onSaveScreenCallback = (content: string) => void;
export type onInputCallback = (ev: KeyboardEvent) => void;
export type onInputKeyUpCallback = (ev: KeyboardEvent) => void;

export type ScreenOptions = {
  inputMode: InputMode,
  onCleanScreen: OnCleanScreenCallback,
  onSaveScreen: onSaveScreenCallback,
  onInput: onInputCallback,
  onInputKeyUp: onInputKeyUpCallback,
};

export const PROMPT = '>';
export const LINE_SELECTOR = ':scope > span .print-table tr, :scope > span';


export default class Screen {
  #max_lines = 750;
  #max_buff_lines = 100;
  #input_info: InputInfo = {
    username: 'Unknown',
    version: 'Unknown',
    host: 'Unknown',
  };

  #questions: Array<Question> = [];
  #question_active: Question | void;

  #lazyVacuum: DebounceInnerCallback = debounce(() => this.#vacuum(), 650);

  #options: ScreenOptions;
  #buff: Array<string> = [];

  // $FlowFixMe
  #$container: Object;
  // $FlowFixMe
  #$screen: Object;
  // $FlowFixMe
  #$input: Object;
  // $FlowFixMe
  #$inputMulti: Object;
  // $FlowFixMe
  #$inputMultiInfo: Object;
  // $FlowFixMe
  #$shadowInput: Object;
  // $FlowFixMe
  #$userInput: Object;
  // $FlowFixMe
  #$promptContainers: Object;
  // $FlowFixMe
  #$interactiveContainer: Object;
  // $FlowFixMe
  #$prompt: Object;
  // $FlowFixMe
  #$promptInfoContainer: Object;
  // $FlowFixMe
  #$assistant: Object;
  // $FlowFixMe
  #$assistant_desc: Object;
  // $FlowFixMe
  #$assistant_args: Object;
  // $FlowFixMe
  #$assistant_args_info: Object;

  #wasStart = false;
  #flushing = false;

  constructor(inputInfo: Partial<InputInfo>) {
    this.updateInputInfo(inputInfo);
  }

  // $FlowIgnore
  get maxLines(): number {
    return this.#max_lines;
  }

  // $FlowFixMe
  start(container: Object, options: ScreenOptions) {
    this.#options = options;
    this.#$container = container;
    this.#createScreen();
    this.#createAssistantPanel();
    this.#createUserInput();
    this.#wasStart = true;
    this.updateInputInfo();
  }

  destroy() {
    if (!this.#wasStart) {
      return;
    }
    this.#$screen.off('keydown');
    this.#$input.off('keyup');
    this.#$input.off('keydown');
    this.#$input.off('input');
  }

  getContent(): string {
    if (!this.#wasStart) {
      return '';
    }
    return this.#$screen.html();
  }

  scrollDown() {
    if (!this.#wasStart) {
      return;
    }
    this.#$screen[0].scrollTop = this.#$screen[0].scrollHeight;
  }

  clean() {
    if (!this.#wasStart) {
      return;
    }
    this.#$screen.html('');
    if (Object.hasOwn(this.#options, 'onCleanScreen')) {
      this.#options.onCleanScreen(this.getContent());
    }
  }

  cleanInput() {
    if (!this.#wasStart) {
      return;
    }
    this.#$input.val('');
    this.cleanShadowInput();
    this.updateAssistantPanelOptions([], -1, 0);
  }

  cleanShadowInput() {
    if (!this.#wasStart || !this.#$shadowInput) {
      return;
    }
    this.#$shadowInput.val('');
  }

  updateInput(str: string) {
    if (!this.#wasStart) {
      return;
    }
    this.#$input.val(str);
    this.cleanShadowInput();
  }

  getInputCaretStartPos(): number {
    if (!this.#wasStart) {
      return -1;
    }
    return this.#$input[0].selectionStart;
  }

  setInputMode(mode: InputMode) {
    this.#options.inputMode = mode;
    this.#updateInputMode(this.#options.inputMode);
  }

  setInputCaretPos(start: number, end?: number) {
    if (!this.#wasStart) {
      return;
    }
    this.#$input[0].selectionStart = start;
    this.#$input[0].selectionEnd = end !== null && typeof end !== 'undefined' ? end : start;
  }

  updateShadowInput(str: string) {
    if (!this.#wasStart || !this.#$shadowInput) {
      return;
    }
    this.#$shadowInput.val(str);
    // Deferred to ensure that has updated values
    // The trick here is to jump to a new frame
    setTimeout(() => {
      this.#$shadowInput.scrollLeft(this.#$input.scrollLeft(), 0);
    }, 1);
  }

  #cleanAssistant() {
    this.#$assistant_args.html('');
    this.#$assistant_args_info.html('');
    this.#$assistant_desc.html('');
  }

  updateAssistantPanelOptions(
    options: $ReadOnlyArray<CMDAssistantOption>,
    selected_option_index: number,
    total_options_count: number,
  ) {
    if (!this.#wasStart) {
      return;
    }

    if (typeof this.#question_active !== 'undefined') {
      this.#cleanAssistant();
      return;
    }

    const html_options = [];
    options.forEach((option, index) =>
      html_options.push(renderAssistantArgOptionItem(option, index, selected_option_index)),
    );
    this.#$assistant_args.html(renderAssistantArgOptionList(html_options));
    if (total_options_count <= 0) {
      this.#$assistant_args_info.html('');
    } else {
      this.#$assistant_args_info.text(`${options.length} of ${total_options_count}`);
    }

    if (selected_option_index !== -1 || options.length === 1) {
      const opt = options[selected_option_index === -1 ? 0 : selected_option_index];
      if (opt.is_command) {
        this.#$assistant_desc.html(opt.description);
      } else {
        this.#$assistant_desc.html(`${opt.type}. ${opt.description}`);
      }
    } else {
      this.#$assistant_desc.html('');
    }
  }

  preventLostInputFocus(ev?: KeyboardEvent) {
    if (!this.#wasStart) {
      return;
    }
    const isCKey = ev && (ev.ctrlKey || ev.altKey);
    if (isCKey === null || typeof isCKey === 'undefined' || !isCKey) {
      this.focus();
    }
  }

  focus() {
    if (!this.#wasStart) {
      return;
    }
    this.#$input.focus();
  }

  getUserInput(): string {
    if (!this.#wasStart) {
      return '';
    }
    if (this.#options.inputMode === 'multi') {
      return this.#$inputMulti.val();
    }
    return this.#$input.val();
  }

  /* PRINT */
  flush() {
    if (!this.#flushing) {
      this.#flushing = true;
      window.requestAnimationFrame(() => this.#flush());
    }
  }

  #flush() {
    if (!this.#wasStart) {
      this.#flushing = false;
      return;
    }
    this.#$screen.append(this.#buff.splice(0, this.#max_buff_lines).join(''));
    this.#lazyVacuum();
    this.scrollDown();

    if (this.#buff.length === 0) {
      if (Object.hasOwn(this.#options, 'onSaveScreen')) {
        this.#options.onSaveScreen(this.getContent());
      }
      this.#flushing = false;
    } else {
      window.requestAnimationFrame(() => this.#flush());
    }
  }

  printHelpSimple(cmd: string, cmd_def: CMDDef) {
    this.print(renderHelpCmd(cmd, cmd_def.definition));
  }

  #printHTML(html: string) {
    this.#buff.push(html);
    this.flush();
  }

  print(msg: mixed, enl: boolean = false, cls?: string) {
    let scls = cls || '';
    if (!enl) {
      scls = `line-br ${scls}`;
    }
    this.#print(msg, scls);
  }

  eprint(msg: mixed, enl: boolean = false, cls?: string) {
    const emsg = typeof msg === 'string' ? encodeHTML(msg) : msg;
    this.print(emsg, enl, cls);
  }

  printCommand(cmd: string, secured: boolean = false) {
    this.eprint(secured ? renderPromptCmdHiddenArgs(PROMPT, cmd) : renderPromptCmd(PROMPT, cmd));
  }

  printError(error: string, internal: boolean = false) {
    if (!error) {
      return;
    }
    if (!internal) {
      this.#print(`[!] ${error}`, 'line-br');
      return;
    }
    const error_id = new Date().getTime();
    let error_msg = error;
    if (typeof error === 'object' && Object.hasOwn(error, 'data') && Object.hasOwn(error.data, 'name')) {
      // It's an Odoo error report
      error_msg = renderErrorMessage(
        encodeHTML(error.data.name),
        encodeHTML(error.data.message),
        error_id,
        error.data.exception_type || error.data.type,
        error.data.context && JSON.stringify(error.data.context),
        error.data.arguments && JSON.stringify(error.data.arguments),
        error.data.debug && encodeHTML(error.data.debug),
      );
    } else if (typeof error === 'object' && Object.hasOwn(error, 'status') && error.status !== '200') {
      // It's an Odoo/jQuery error report
      error_msg = renderErrorMessage(
        encodeHTML(error.statusText),
        encodeHTML(error.statusText),
        error_id,
        i18n.t('terminal.error.invalidHTTPRequest', 'Invalid HTTP Request'),
        '',
        '',
        encodeHTML(error.responseText || ''),
      );
    } else if (typeof error === 'object' && Object.hasOwn(error, 'data') && Object.hasOwn(error.data, 'debug')) {
      const debug_error = JSON.parse(error.data.debug).error;
      error_msg = renderErrorMessage(
        encodeHTML(debug_error.data.name),
        encodeHTML(debug_error.data.message),
        error_id,
        encodeHTML(debug_error.message),
        debug_error.data.context && JSON.stringify(debug_error.data.context),
        debug_error.data.arguments && JSON.stringify(debug_error.data.arguments),
        encodeHTML(debug_error.data.debug || ''),
      );
    }

    this.#print(error_msg, 'error_message');
  }

  printTable(columns: $ReadOnlyArray<string>, rows: $ReadOnlyArray<$ReadOnlyArray<string>>, cls: string) {
    this.print(renderTable(columns, rows, cls));
  }

  updateInputInfo(info?: Partial<InputInfo>) {
    Object.assign(this.#input_info, info);
    if (!this.#wasStart) {
      return;
    }
    if (Object.hasOwn(this.#input_info, 'username')) {
      this.#$userInput
        .find('#terminal-prompt-main')
        // $FlowFixMe
        .html(`${this.#input_info.username}&nbsp;`)
        .attr('title', this.#input_info.username);
    }
    if (Object.hasOwn(this.#input_info, 'version')) {
      this.#$userInput
        .find('#terminal-prompt-info-version')
        .text(this.#input_info.version)
        .attr('title', this.#input_info.version);
    }
    if (
      Object.hasOwn(this.#input_info, 'host') &&
      this.#input_info.host !== null &&
      typeof this.#input_info.host !== 'undefined'
    ) {
      this.#$userInput
        .find('#terminal-prompt-info-host')
        .text(this.#input_info.host)
        .attr('title', this.#input_info.host);
      // Custom color indicator per host
      // $FlowFixMe
      if (this.#input_info.host.startsWith('localhost') || this.#input_info.host.startsWith('127.0.0.1')) {
        this.#$promptContainers.css({
          'background-color': '#adb5bd',
          color: 'black',
        });
        this.#$promptInfoContainer.css({
          'background-color': '#828587',
          color: 'black',
        });
      } else {
        // $FlowFixMe
        const color_info = genColorFromString(this.#input_info.host);
        this.#$promptContainers.css({
          'background-color': `rgb(${color_info.rgb[0]},${color_info.rgb[1]},${color_info.rgb[2]})`,
          color: color_info.gv < 0.5 ? '#000' : '#fff',
        });
        // eslint-disable-next-line prefer-const
        let [h, s, v] = rgb2hsv(color_info.rgb[0] / 255.0, color_info.rgb[1] / 255.0, color_info.rgb[2] / 255.0);
        v -= 0.2;
        const [r, g, b] = hsv2rgb(h, s, v);
        this.#$promptInfoContainer.css({
          'background-color': `rgb(${r * 255},${g * 255},${b * 255})`,
          color: color_info.gv < 0.5 ? '#000' : '#fff',
        });
      }
    }
  }

  #updateInputMode(mode: InputMode) {
    console.log("MODE", mode)
    this.#$inputMulti.toggleClass('d-none hidden', mode !== 'multi');
    this.#$inputMultiInfo.toggleClass('d-none hidden', mode !== 'multi');
    this.#$input.toggleClass('d-none hidden', mode === 'multi');
    this.#$shadowInput.toggleClass('d-none hidden', mode === 'multi');
    this.#cleanAssistant();
  }

  getQuestionActive(): Question | void {
    return this.#question_active;
  }

  showQuestion(question: string, values: $ReadOnlyArray<string>, def_value: string): Promise<> {
    const _defer = defer();
    this.#questions.push({
      question: question,
      values: values,
      def_value: def_value,
      defer: _defer,
    });
    this.updateQuestions();
    return _defer.promise;
  }

  updateQuestions() {
    if (typeof this.#question_active === 'undefined' && this.#questions.length) {
      if (this.#options.inputMode !== 'single') {
        this.#updateInputMode('single');
      }
      this.#question_active = this.#questions.shift();
      const values = this.#question_active.values.map(item => {
        // $FlowFixMe
        if (item === this.#question_active.def_value) {
          return `<strong>${item.toUpperCase()}</strong>`;
        }
        return item;
      });
      if (values.length === 0) {
        // $FlowFixMe
        this.#$interactiveContainer.html(`<span>${this.#question_active.question}</span>`);
      } else {
        // $FlowFixMe
        this.#$interactiveContainer.html(`<span>${this.#question_active.question} [${values.join('/')}]</span>`);
      }
      this.#$interactiveContainer.removeClass('d-none hidden');
    } else {
      this.#question_active = undefined;
      this.#$interactiveContainer.html('');
      this.#$interactiveContainer.addClass('d-none hidden');
      if (this.#options.inputMode !== 'single') {
        this.#updateInputMode(this.#options.inputMode);
      }
    }
  }

  responseQuestion(question: Question, response: string) {
    question.defer.resolve((!response && question.def_value) || response);
    this.updateQuestions();
    this.cleanInput();
  }

  rejectQuestion(question: Question, reason: string) {
    question.defer.reject(reason);
    this.updateQuestions();
    this.cleanInput();
  }

  applyStyle(name: string, value: string) {
    this.#$screen.css(name, value);
  }

  replaceUserInputToken(input_str: string, cur_token: TokenInfo, str: string) {
    let res_str = null;
    if (cur_token) {
      res_str = `${input_str.substr(0, cur_token.start)}${str}`;
    } else {
      res_str = `${input_str}${str}`;
    }
    const n_caret_pos = res_str.length;
    if (cur_token) {
      res_str += input_str.substr(cur_token.end);
    }
    if (res_str) {
      this.updateInput(res_str);
    }
    if (n_caret_pos !== -1) {
      this.setInputCaretPos(n_caret_pos);
    }
  }

  /* PRIVATE */
  #print(msg: mixed, cls?: string) {
    const formatted_msgs = renderLine(msg, cls);
    for (const line of formatted_msgs) {
      this.#printHTML(line);
    }
  }

  #vacuum() {
    if (!this.#wasStart) {
      return;
    }

    const $lines = Array.from(this.#$screen[0].querySelectorAll(LINE_SELECTOR));
    const diff = $lines.length - this.#max_lines;
    if (diff > 0) {
      const nodes = $lines.slice(0, diff);
      do {
        const node = nodes.pop();
        const can_be_deleted = node.querySelector('.print-table tbody:empty') || !node.querySelector('.print-table');
        if (can_be_deleted) {
          node.remove();
        }
      } while (nodes.length);
    }
  }

  #createScreen() {
    this.#$screen = $(renderScreen());
    this.#$screen.appendTo(this.#$container);
    this.#$screen.on('keydown', ev => this.preventLostInputFocus(ev));
  }

  #createAssistantPanel() {
    this.#$assistant = $(renderAssistantPanel());
    this.#$assistant_args = this.#$assistant.find('#terminal_assistant_args');
    this.#$assistant_args_info = this.#$assistant.find('#terminal_assistant_args_info');
    this.#$assistant_desc = this.#$assistant.find('#terminal_assistant_desc');
    this.#$assistant.appendTo(this.#$container);
  }

  #createUserInput() {
    this.#$userInput = $(renderUserInput(PROMPT));
    this.#$userInput.appendTo(this.#$container);
    this.#$promptContainers = this.#$userInput.find('.terminal-prompt-container');
    this.#$interactiveContainer = this.#$userInput.find('.terminal-prompt-container.terminal-prompt-interactive');
    this.#$prompt = this.#$promptContainers.find('.terminal-prompt');
    this.#$promptInfoContainer = this.#$userInput.find('.terminal-prompt-container.terminal-prompt-info');
    this.#$input = this.#$userInput.find('#terminal_input');
    this.#$shadowInput = this.#$userInput.find('#terminal_shadow_input');
    this.#$inputMulti = this.#$userInput.find('#terminal_input_multi');
    this.#$inputMultiInfo = this.#$container.find('#terminal_input_multi_info');
    this.#$input.on('keyup', ev => this.#options.onInputKeyUp(ev));
    this.#$input.on('keydown', ev => this.#onInputKeyDown(ev));
    this.#$input.on('input', ev => this.#options.onInput(ev));
    this.#$inputMulti.on('keyup', ev => this.#options.onInputKeyUp(ev));
    this.#updateInputMode(this.#options.inputMode);
  }

  /* EVENTS */
  #onInputKeyDown(ev: KeyboardEvent) {
    if (ev.keyCode === 9) {
      // Press Tab
      ev.preventDefault();
    }
    // Only allow valid responses to questions
    if (ev.keyCode !== 8 && typeof this.#question_active !== 'undefined' && this.#question_active.values.length) {
      const cur_value = this.#$input.value;
      const next_value = `${cur_value}${String.fromCharCode(ev.keyCode)}`.toLowerCase();
      // $FlowFixMe
      const is_invalid = this.#question_active.values.filter(item => item.startsWith(next_value)).length === 0;
      if (is_invalid) {
        ev.preventDefault();
      }
    }
  }
}
