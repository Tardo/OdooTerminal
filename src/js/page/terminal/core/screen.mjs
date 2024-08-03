// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

// $FlowIgnore
import i18n from 'i18next';
import renderPromptCmd from '@terminal/templates/prompt_command';
import renderPromptCmdHiddenArgs from '@terminal/templates/prompt_command_hidden_args';
import renderErrorMessage from '@terminal/templates/error_message';
import renderHelpCmd from '@terminal/templates/help_command';
import renderScreen from '@terminal/templates/screen';
import renderAssistantPanel from '@terminal/templates/screen_assistant_panel';
import renderAssistantArgOptionItem from '@terminal/templates/screen_assistant_panel_arg_option_item';
import renderAssistantArgOptionList from '@terminal/templates/screen_assistant_panel_arg_option_list';
import renderLine from '@terminal/templates/screen_line';
import renderTable from '@terminal/templates/screen_table';
import renderUserInput from '@terminal/templates/screen_user_input';
import parseHTML from '@terminal/utils/parse_html';
import debounce from '@terminal/utils/debounce';
import defer from '@terminal/utils/defer';
import encodeHTML from '@terminal/utils/encode_html';
import genColorFromString from '@terminal/utils/gen_color_from_string';
import hsv2rgb from '@terminal/utils/hsv2rgb';
import rgb2hsv from '@terminal/utils/rgb2hsv';
import ElementNotFoundError from '@terminal/exceptions/element_not_found_error';
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
  def_value: string | number | void,
  // $FlowFixMe
  defer: Object,
};

export type OnCleanScreenCallback = (content: string) => void;
export type onSaveScreenCallback = (content: string) => void;
export type onInputCallback = (ev: InputEvent) => void;
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
  #buff: Array<HTMLElement> = [];

  #container_el: HTMLElement;
  #screen_el: HTMLElement;
  #input_el: HTMLInputElement;
  #inputMulti_el: HTMLInputElement;
  #inputMultiInfo_el: HTMLInputElement;
  #shadowInput_el: HTMLInputElement;
  #userInput_el: HTMLElement;
  #promptContainer_els: NodeList<HTMLElement>;
  #interactiveContainer_el: HTMLElement;
  #prompt_el: HTMLElement;
  #promptInfoContainer_el: HTMLElement;
  #assistant_el: HTMLElement;
  #assistant_desc_el: HTMLElement;
  #assistant_args_el: HTMLElement;
  #assistant_args_info_el: HTMLElement;

  #wasStart = false;
  #flushing = false;

  constructor(inputInfo: Partial<InputInfo>) {
    this.updateInputInfo(inputInfo);
  }

  // $FlowIgnore
  get maxLines(): number {
    return this.#max_lines;
  }

  start(container: HTMLElement, options: ScreenOptions) {
    this.#options = options;
    this.#container_el = container;
    this.#createScreen();
    this.#createUserInput();
    this.#createAssistantPanel();
    this.#wasStart = true;
    this.updateInputInfo();
  }

  destroy() {
    // To override
  }

  getContent(): string {
    if (!this.#wasStart) {
      return '';
    }
    return this.#screen_el.innerHTML;
  }

  scrollDown() {
    if (!this.#wasStart) {
      return;
    }
    this.#screen_el.scrollTop = this.#screen_el.scrollHeight;
  }

  clean() {
    if (!this.#wasStart) {
      return;
    }
    this.#screen_el.textContent = '';
    if (Object.hasOwn(this.#options, 'onCleanScreen')) {
      this.#options.onCleanScreen(this.getContent());
    }
  }

  cleanInput() {
    if (!this.#wasStart) {
      return;
    }
    this.#input_el.value = '';
    this.cleanShadowInput();
    this.updateAssistantPanelOptions([], -1, 0);
  }

  cleanShadowInput() {
    if (!this.#wasStart || !this.#shadowInput_el) {
      return;
    }
    this.#shadowInput_el.value = '';
  }

  refresh() {
    this.clean();
    this.cleanInput();
  }

  updateInput(str: string) {
    if (!this.#wasStart) {
      return;
    }
    this.#input_el.value = str;
    this.cleanShadowInput();
  }

  getInputCaretStartPos(): number {
    if (!this.#wasStart) {
      return -1;
    }
    return this.#input_el.selectionStart;
  }

  setInputMode(mode: InputMode) {
    this.#options.inputMode = mode;
    this.#updateInputMode(this.#options.inputMode);
  }

  setInputCaretPos(start: number, end?: number) {
    if (!this.#wasStart) {
      return;
    }
    this.#input_el.selectionStart = start;
    this.#input_el.selectionEnd = end !== null && typeof end !== 'undefined' ? end : start;
  }

  updateShadowInput(str: string) {
    if (!this.#wasStart || !this.#shadowInput_el) {
      return;
    }
    this.#shadowInput_el.value = str;
    // Deferred to ensure that has updated values
    // The trick here is to jump to a new frame
    setTimeout(() => {
      this.#shadowInput_el.scrollLeft = this.#input_el.scrollLeft;
    }, 1);
  }

  #cleanAssistant() {
    if (this.#assistant_args_el) {
      this.#assistant_args_el.textContent = '';
      this.#assistant_args_info_el.textContent = '';
      this.#assistant_desc_el.textContent = '';
    }
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
    this.#assistant_args_el.textContent = '';
    this.#assistant_args_el.append(parseHTML(renderAssistantArgOptionList(html_options)));
    if (total_options_count <= 0) {
      this.#assistant_args_info_el.textContent = '';
    } else {
      this.#assistant_args_info_el.textContent = `${options.length} of ${total_options_count}`;
    }

    if (selected_option_index !== -1 || options.length === 1) {
      const opt = options[selected_option_index === -1 ? 0 : selected_option_index];
      if (opt.is_command) {
        this.#assistant_desc_el.textContent = opt.description;
      } else {
        this.#assistant_desc_el.textContent = `${opt.type}. ${opt.description}`;
      }
    } else {
      this.#assistant_desc_el.textContent = '';
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
    this.#input_el.focus();
  }

  getUserInputEl(): HTMLInputElement | void {
    if (!this.#wasStart) {
      return undefined;
    }
    if (this.#options.inputMode === 'multi') {
      return this.#inputMulti_el;
    }
    return this.#input_el;
  }

  getUserInput(): string {
    return this.getUserInputEl()?.value ?? '';
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
    const buff_els = this.#buff.splice(0, this.#max_buff_lines);
    for (let i = 0; i < buff_els.length; ++i) {
      this.#screen_el.append(buff_els[i]);
    }
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

  printHelpSimple(cmd: string, cmd_def: CMDDef, is_internal: boolean) {
    this.print(renderHelpCmd(cmd, cmd_def.definition, is_internal));
  }

  #printHTML(html: string) {
    this.#buff.push(parseHTML(html));
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
      const prompt_el = this.#userInput_el.querySelector('#terminal-prompt-main');
      if (prompt_el) {
        prompt_el.textContent = this.#input_info.username;
        prompt_el.setAttribute('title', this.#input_info.username);
      }
    }
    if (Object.hasOwn(this.#input_info, 'version')) {
      const info_ver_info = this.#userInput_el.querySelector('#terminal-prompt-info-version');
      if (info_ver_info) {
        info_ver_info.textContent = this.#input_info.version;
        info_ver_info.setAttribute('title', this.#input_info.version);
      }
    }
    if (
      Object.hasOwn(this.#input_info, 'host') &&
      this.#input_info.host !== null &&
      typeof this.#input_info.host !== 'undefined'
    ) {
      const info_host_el = this.#userInput_el.querySelector('#terminal-prompt-info-host');
      if (info_host_el) {
        info_host_el.textContent = this.#input_info.host;
        info_host_el.setAttribute('title', this.#input_info.host);
      }
      // Custom color indicator per host
      if (this.#input_info.host.startsWith('localhost') || this.#input_info.host.startsWith('127.0.0.1')) {
        for (const container_el of this.#promptContainer_els) {
          Object.assign(container_el.style, {
            backgroundColor: '#adb5bd',
            color: 'black',
          });
        }
        Object.assign(this.#promptInfoContainer_el.style, {
          backgroundColor: '#828587',
          color: 'black',
        });
      } else {
        const color_info = genColorFromString(this.#input_info.host);
        for (const container_el of this.#promptContainer_els) {
          Object.assign(container_el.style, {
            backgroundColor: `rgb(${color_info.rgb[0]},${color_info.rgb[1]},${color_info.rgb[2]})`,
            color: color_info.gv < 0.5 ? '#000' : '#fff',
          });
        }

        // eslint-disable-next-line prefer-const
        let [h, s, v] = rgb2hsv(color_info.rgb[0] / 255.0, color_info.rgb[1] / 255.0, color_info.rgb[2] / 255.0);
        v -= 0.2;
        const [r, g, b] = hsv2rgb(h, s, v);
        Object.assign(this.#promptInfoContainer_el.style, {
          backgroundColor: `rgb(${r * 255},${g * 255},${b * 255})`,
          color: color_info.gv < 0.5 ? '#000' : '#fff',
        });
      }
    }
  }

  #updateInputMode(mode: InputMode) {
    this.#inputMulti_el.classList.toggle('d-none', mode !== 'multi');
    this.#inputMulti_el.classList.toggle('hidden', mode !== 'multi');
    this.#inputMultiInfo_el.classList.toggle('d-none', mode !== 'multi');
    this.#inputMultiInfo_el.classList.toggle('hidden', mode !== 'multi');
    this.#input_el.classList.toggle('d-none', mode === 'multi');
    this.#input_el.classList.toggle('hidden', mode === 'multi');
    this.#shadowInput_el.classList.toggle('d-none', mode === 'multi');
    this.#shadowInput_el.classList.toggle('hidden', mode === 'multi');
    this.#cleanAssistant();
  }

  getQuestionActive(): Question | void {
    return this.#question_active;
  }

  async showQuestion(question: string, values: $ReadOnlyArray<string>, def_value: string): Promise<> {
    const _defer = defer();
    this.#questions.push({
      question: question,
      values: values || [],
      def_value: def_value,
      defer: _defer,
    });
    this.updateQuestions();
    return await _defer.promise;
  }

  updateQuestions() {
    if (typeof this.#question_active === 'undefined' && this.#questions.length) {
      if (this.#options.inputMode !== 'single') {
        this.#updateInputMode('single');
      }
      this.#question_active = this.#questions.shift();
      if (this.#question_active.values) {
        const values = this.#question_active.values.map(item => {
          // $FlowFixMe
          if (item === this.#question_active.def_value) {
            return item.toUpperCase();
          }
          return item;
        });
        if (values.length === 0) {
          this.#interactiveContainer_el.textContent = this.#question_active?.question || '';
        } else {
          this.#interactiveContainer_el.textContent = `${this.#question_active?.question || ''} [${values.join('/')}]`;
        }
      }
      this.#interactiveContainer_el.classList.remove('d-none', 'hidden');
      this.#input_el.classList.add('highlight');
    } else {
      this.#question_active = undefined;
      this.#interactiveContainer_el.textContent = '';
      this.#interactiveContainer_el.classList.add('d-none', 'hidden');
      this.#input_el.classList.remove('highlight');
      if (this.#options.inputMode !== 'single') {
        this.#updateInputMode(this.#options.inputMode);
      }
    }
  }

  responseQuestion(question: Question, response: string) {
    // $FlowIgnore
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
    Object.assign(this.#screen_el.style, {
      [name]: value,
    });
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

    const $lines = Array.from(this.#screen_el.querySelectorAll(LINE_SELECTOR));
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
    this.#screen_el = parseHTML(renderScreen());
    this.#container_el.append(this.#screen_el);
    this.#screen_el.addEventListener('keydown', ev => this.preventLostInputFocus(ev));
  }

  #createAssistantPanel(): void {
    this.#assistant_el = parseHTML(renderAssistantPanel());

    let elm = this.#assistant_el.querySelector('#terminal_assistant_args');
    if (elm) {
      this.#assistant_args_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_assistant_args');
    }
    elm = this.#assistant_el.querySelector('#terminal_assistant_args_info');
    if (elm) {
      this.#assistant_args_info_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_assistant_args_info');
    }
    elm = this.#assistant_el.querySelector('#terminal_assistant_desc');
    if (elm) {
      this.#assistant_desc_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_assistant_desc');
    }
    this.#container_el.append(this.#assistant_el);
  }

  #createUserInput(): void {
    this.#userInput_el = parseHTML(renderUserInput(PROMPT));
    this.#container_el.append(this.#userInput_el)
    const elms = this.#userInput_el.querySelectorAll('.terminal-prompt-container');
    if (elms) {
      this.#promptContainer_els = elms;
    } else {
      throw new ElementNotFoundError('.terminal-prompt-container');
    }
    let elm = this.#userInput_el.querySelector('.terminal-prompt-container.terminal-prompt-interactive');
    if (elm) {
      this.#interactiveContainer_el = elm;
    } else {
      throw new ElementNotFoundError('.terminal-prompt-container.terminal-prompt-interactive');
    }
    elm = this.#userInput_el.querySelector('.terminal-prompt');
    if (elm) {
      this.#prompt_el = elm;
    } else {
      throw new ElementNotFoundError('.terminal-prompt');
    }
    elm = this.#userInput_el.querySelector('.terminal-prompt-container.terminal-prompt-info');
    if (elm) {
      this.#promptInfoContainer_el = elm;
    } else {
      throw new ElementNotFoundError('.terminal-prompt-container.terminal-prompt-info');
    }
    elm = this.#userInput_el.querySelector('#terminal_input');
    if (elm) {
      // $FlowFixMe
      this.#input_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_input');
    }
    elm = this.#userInput_el.querySelector('#terminal_shadow_input');
    if (elm) {
      // $FlowFixMe
      this.#shadowInput_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_shadow_input');
    }
    elm = this.#userInput_el.querySelector('#terminal_input_multi');
    if (elm) {
      // $FlowFixMe
      this.#inputMulti_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_input_multi');
    }
    elm = this.#userInput_el.querySelector('#terminal_input_multi_info');
    if (elm) {
      // $FlowFixMe
      this.#inputMultiInfo_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_input_multi_info');
    }
    this.#input_el.addEventListener('keyup', ev => this.#options.onInputKeyUp(ev));
    this.#input_el.addEventListener('keydown', ev => this.#onInputKeyDown(ev));
    this.#input_el.addEventListener('input', ev => this.#options.onInput(ev));
    this.#inputMulti_el.addEventListener('keyup', ev => this.#options.onInputKeyUp(ev));
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
      const cur_value = this.#input_el.value;
      const next_value = `${cur_value}${String.fromCharCode(ev.keyCode)}`.toLowerCase();
      // $FlowFixMe
      const is_invalid = this.#question_active.values.filter(item => item.startsWith(next_value)).length === 0;
      if (is_invalid) {
        ev.preventDefault();
      }
    }
  }
}
