// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

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
import getColorGrayValue from '@terminal/utils/get_color_gray_value';
import hsl2rgb from '@terminal/utils/hsl2rgb';
import rgb2hsl from '@terminal/utils/rgb2hsl';
import hex2rgb from '@terminal/utils/hex2rgb';
import ElementNotFoundError from '@terminal/exceptions/element_not_found_error';
import type {RGB} from '@terminal/utils/hex2rgb';
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
  defer: {resolve: (mixed) => void, reject: (string) => void},
};

export type OnCleanScreenCallback = (content: string) => void;
export type onSaveScreenCallback = (content: string) => void;
export type onInputCallback = (ev: InputEvent) => void;
export type onInputKeyUpCallback = (ev: KeyboardEvent) => void;
export type onAttachFileCallback = () => void;
export type onRemoveAttachmentCallback = (index: number) => void;
export type onScreenshotViewportCallback = () => void;
export type onScreenshotPickCallback = () => void;

export type ScreenOptions = {
  inputColors: {[string]: string},
  inputMode: InputMode,
  onCleanScreen: OnCleanScreenCallback,
  onSaveScreen: onSaveScreenCallback,
  onInput: onInputCallback,
  onInputKeyUp: onInputKeyUpCallback,
  onAttachFile?: onAttachFileCallback,
  onRemoveAttachment?: onRemoveAttachmentCallback,
  onScreenshotViewport?: onScreenshotViewportCallback,
  onScreenshotPick?: onScreenshotPickCallback,
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

  #attachBtn_el: HTMLElement | void;
  #attachMenu_el: HTMLElement | void;
  #menuCloseHandler: ((e: MouseEvent) => void) | null = null;
  #attachPreview_el: HTMLElement | void;
  #attachLightbox_el: HTMLElement | void;
  #attachLightboxImg_el: HTMLImageElement | void;

  #wasStart = false;
  #flushing = false;

  constructor(inputInfo: Partial<InputInfo>) {
    this.updateInputInfo(inputInfo);
  }

  // $FlowFixMe[unsafe-getters-setters]
  get maxLines(): number {
    return this.#max_lines;
  }

  start(container: HTMLElement, options: ScreenOptions) {
    this.#options = options;
    this.#container_el = container;
    this.#createScreen();
    this.#createAttachPreview();
    this.#createUserInput();
    this.#createAssistantPanel();
    this.#wasStart = true;
    this.updateInputInfo();
  }

  destroy() {
    // To override
  }

  show() {
    this.#container_el.classList.add('terminal-transition-topdown');
    this.focus();
  }

  hide() {
    this.#container_el.classList.remove('terminal-transition-topdown');
  }

  getContent(): string {
    if (!this.#wasStart) {
      return '';
    }
    return this.#screen_el.innerHTML;
  }

  setContent(html: string) {
    if (!this.#wasStart) {
      return;
    }
    const wrapper = parseHTML(`<div>${html}</div>`);
    this.#screen_el.replaceChildren(...Array.from(wrapper.childNodes));
    this.scrollDown();
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
    this.#input_el.selectionEnd = end ?? start;
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
    if (!this.#wasStart || this.#options.inputMode === 'multi') {
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
    // $FlowFixMe[sketchy-null-bool]
    if (!isCKey) {
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

  setInputDisabled(disabled: boolean) {
    if (!this.#wasStart) {
      return;
    }
    this.#input_el.disabled = disabled;
    this.#inputMulti_el.disabled = disabled;
    this.#userInput_el.classList.toggle('terminal-input-disabled', disabled);
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

  printAttachments(attachments: $ReadOnlyArray<AIAttachment>) {
    if (!attachments.length) {
      return;
    }
    const parts = attachments.map(att => {
      const escapedName = encodeHTML(att.name);
      if (att.media_type.startsWith('image/')) {
        const src = `data:${encodeHTML(att.media_type)};base64,${att.data}`;
        return `<span class="terminal-attach-bubble terminal-attach-sent"><img class="terminal-attach-thumb" alt="${escapedName}" src="${src}" /><span class="terminal-attach-name">${escapedName}</span></span>`;
      }
      const icon = this.#mimeToIcon(att.media_type);
      return `<span class="terminal-attach-bubble terminal-attach-sent"><i class="fa ${icon} terminal-attach-icon"></i><span class="terminal-attach-name">${escapedName}</span></span>`;
    });
    this.print(`<span class="terminal-ai-sent-attachments">${parts.join('')}</span>`);
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
    // $FlowFixMe[incompatible-use]
    } else if (typeof error === 'object' && Object.hasOwn(error, 'status') && String(error.status) !== '200') {
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

  printLive(cls?: string): {update: (html: string) => void, el: HTMLSpanElement} {
    const el = document.createElement('span');
    el.className = cls !== undefined ? `line-text line-br ${cls}` : 'line-text line-br';
    if (this.#wasStart) {
      this.#screen_el.append(el);
      this.scrollDown();
    }
    return {
      el,
      update: (html: string) => {
        const wrapper = parseHTML(`<span>${html}</span>`);
        el.replaceChildren(...Array.from(wrapper.childNodes));
        if (this.#wasStart) {
          this.scrollDown();
        }
      },
    };
  }

  updateInputInfo(info?: Partial<InputInfo>) {
    this.#input_info = {
      ...this.#input_info,
      ...info,
    };
    if (!this.#wasStart) {
      return;
    }
    if (Object.hasOwn(this.#input_info, 'username')) {
      const prompt_el = this.#userInput_el.querySelector('#terminal-prompt-main');
      if (prompt_el) {
        prompt_el.textContent = this.#input_info.username;
        prompt_el.setAttribute('title', this.#input_info.username);
        // $FlowFixMe[prop-missing]
        this.#assistant_el.style.bottom = (prompt_el.offsetHeight + 4) + 'px';
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
          container_el.style.backgroundColor = '#adb5bd';
          container_el.style.color = 'black';
        }
        this.#promptInfoContainer_el.style.backgroundColor = '#828587';
        this.#promptInfoContainer_el.style.color = 'black';
      } else {
        let main_rgb: RGB = [0, 0, 0];
        if (Object.hasOwn(this.#options.inputColors, this.#input_info.host)) {
          const hex_color = parseInt(this.#options.inputColors[this.#input_info.host].replace('#', ''), 16);
          main_rgb = hex2rgb(hex_color);
        } else {
          main_rgb = genColorFromString(this.#input_info.host);
        }
        for (const container_el of this.#promptContainer_els) {
          container_el.style.backgroundColor = `rgb(${main_rgb[0]},${main_rgb[1]},${main_rgb[2]})`;
          container_el.style.color = getColorGrayValue(main_rgb) < 0.5 ? '#000' : '#fff';
        }

        const hsl = rgb2hsl(main_rgb);
        hsl[2] = Math.max(hsl[2] - 0.2, 0.0);
        const secondary_rgb = hsl2rgb(hsl);
        this.#promptInfoContainer_el.style.backgroundColor = `rgb(${secondary_rgb[0]},${secondary_rgb[1]},${secondary_rgb[2]})`
        this.#promptInfoContainer_el.style.color = getColorGrayValue(secondary_rgb) < 0.5 ? '#000' : '#fff';
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
      // $FlowFixMe[incompatible-type]
      // $FlowFixMe[incompatible-type]
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
      if (this.#question_active?.values) {
        const active_q = this.#question_active;
        const values = active_q.values.map(item => {
          if (item === active_q.def_value) {
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
      this.show();
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
    // $FlowFixMe[sketchy-null-string]
    // $FlowFixMe[sketchy-null-number]
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
    // $FlowFixMe[incompatible-type]
    // $FlowFixMe[prop-missing]
    this.#screen_el.style[name] = value;
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
        if (node) {
          const can_be_deleted = node.querySelector('.print-table tbody:empty') || !node.querySelector('.print-table');
          if (can_be_deleted) {
            node.remove();
          }
        }
      } while (nodes.length);
    }
  }

  #createScreen() {
    this.#screen_el = parseHTML(renderScreen());
    this.#container_el.append(this.#screen_el);
    this.#screen_el.addEventListener('keydown', ev => this.preventLostInputFocus(ev));
  }

  #buildAttachMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'terminal-ai-attach-submenu';

    // Upload file item
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'terminal-ai-attach-submenu-item';
    uploadBtn.type = 'button';
    uploadBtn.innerHTML = "<i class='fa fa-upload'></i> " + i18n.t('terminal.ai.attachUpload', 'Upload file');
    uploadBtn.addEventListener('click', () => {
      this.#closeAttachMenu();
      if (Object.hasOwn(this.#options, 'onAttachFile') && typeof this.#options.onAttachFile === 'function') {
        this.#options.onAttachFile();
      }
    });
    menu.append(uploadBtn);

    // Screenshot group
    const screenshotGroup = document.createElement('div');
    screenshotGroup.className = 'terminal-ai-attach-submenu-group';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'terminal-ai-attach-submenu-group-header';
    groupHeader.innerHTML = "<i class='fa fa-camera'></i> " + i18n.t('terminal.ai.attachScreenshot', 'Screenshot') + " <i class='fa fa-caret-left'></i>";
    screenshotGroup.append(groupHeader);

    const subMenu = document.createElement('div');
    subMenu.className = 'terminal-ai-attach-submenu-sub';

    const viewportBtn = document.createElement('button');
    viewportBtn.className = 'terminal-ai-attach-submenu-item';
    viewportBtn.type = 'button';
    viewportBtn.innerHTML = "<i class='fa fa-desktop'></i> " + i18n.t('terminal.ai.attachScreenshotViewport', 'Full viewport');
    viewportBtn.addEventListener('click', () => {
      this.#closeAttachMenu();
      if (Object.hasOwn(this.#options, 'onScreenshotViewport') && typeof this.#options.onScreenshotViewport === 'function') {
        this.#options.onScreenshotViewport();
      }
    });
    subMenu.append(viewportBtn);

    const pickBtn = document.createElement('button');
    pickBtn.className = 'terminal-ai-attach-submenu-item';
    pickBtn.type = 'button';
    pickBtn.innerHTML = "<i class='fa fa-crosshairs'></i> " + i18n.t('terminal.ai.attachScreenshotPick', 'Select element');
    pickBtn.addEventListener('click', () => {
      this.#closeAttachMenu();
      if (Object.hasOwn(this.#options, 'onScreenshotPick') && typeof this.#options.onScreenshotPick === 'function') {
        this.#options.onScreenshotPick();
      }
    });
    subMenu.append(pickBtn);

    screenshotGroup.append(subMenu);
    menu.append(screenshotGroup);

    return menu;
  }

  #toggleAttachMenu() {
    const menu = this.#attachMenu_el;
    if (!menu) {
      return;
    }
    if (menu.classList.contains('active')) {
      this.#closeAttachMenu();
    } else {
      menu.classList.add('active');
      const closeHandler = (e: MouseEvent) => {
        const target = e.target;
        if (
          target instanceof Node &&
          !this.#attachBtn_el?.contains(target) &&
          !menu.contains(target)
        ) {
          this.#closeAttachMenu();
        }
      };
      this.#menuCloseHandler = closeHandler;
      setTimeout(() => {
        document.addEventListener('click', closeHandler, true);
      }, 0);
    }
  }

  #closeAttachMenu() {
    const menu = this.#attachMenu_el;
    if (!menu) {
      return;
    }
    menu.classList.remove('active');
    if (this.#menuCloseHandler !== null) {
      document.removeEventListener('click', this.#menuCloseHandler, true);
      this.#menuCloseHandler = null;
    }
  }

  #createAttachPreview(): void {
    const preview = document.createElement('div');
    preview.id = 'terminal_ai_attach_preview';
    preview.className = 'terminal-ai-attach-preview';
    this.#attachPreview_el = preview;
    this.#container_el.append(preview);

    const lightbox = document.createElement('div');
    lightbox.id = 'terminal_ai_attach_lightbox';
    lightbox.className = 'terminal-ai-attach-lightbox d-none hidden';
    lightbox.addEventListener('click', () => this.#closeLightbox());
    const img = document.createElement('img');
    img.className = 'terminal-ai-attach-lightbox-img';
    img.alt = '';
    lightbox.append(img);
    this.#attachLightbox_el = lightbox;
    this.#attachLightboxImg_el = img;
    this.#container_el.append(lightbox);
  }

  #closeLightbox() {
    if (this.#attachLightbox_el) {
      this.#attachLightbox_el.classList.add('d-none', 'hidden');
      if (this.#attachLightboxImg_el) {
        this.#attachLightboxImg_el.src = '';
      }
    }
  }

  #mimeToIcon(mediaType: string): string {
    if (mediaType.startsWith('image/')) {
      return 'fa-file-image-o';
    }
    if (mediaType === 'application/pdf') {
      return 'fa-file-pdf-o';
    }
    if (mediaType.startsWith('text/') || mediaType === 'application/json') {
      return 'fa-file-text-o';
    }
    if (mediaType.startsWith('audio/')) {
      return 'fa-file-audio-o';
    }
    if (mediaType.startsWith('video/')) {
      return 'fa-file-video-o';
    }
    if (mediaType === 'application/zip' || mediaType === 'application/gzip' || mediaType === 'application/x-tar') {
      return 'fa-file-archive-o';
    }
    return 'fa-file-o';
  }

  addAttachmentPreview(att: AIAttachment, index: number) {
    const preview = this.#attachPreview_el;
    if (!preview) {
      return;
    }

    const bubble = document.createElement('div');
    bubble.className = 'terminal-attach-bubble';
    bubble.dataset.attachIndex = String(index);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'terminal-attach-remove';
    removeBtn.type = 'button';
    removeBtn.title = i18n.t('terminal.ai.attachRemove', 'Remove attachment');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (Object.hasOwn(this.#options, 'onRemoveAttachment') && typeof this.#options.onRemoveAttachment === 'function') {
        this.#options.onRemoveAttachment(index);
      }
    });

    const nameEl = document.createElement('span');
    nameEl.className = 'terminal-attach-name';
    nameEl.textContent = att.name;

    if (att.media_type.startsWith('image/')) {
      const img = document.createElement('img');
      img.className = 'terminal-attach-thumb';
      img.alt = att.name;
      img.src = `data:${att.media_type};base64,${att.data}`;
      img.title = i18n.t('terminal.ai.attachExpand', 'Click to enlarge');
      img.addEventListener('click', () => {
        if (this.#attachLightbox_el && this.#attachLightboxImg_el) {
          this.#attachLightboxImg_el.src = img.src;
          this.#attachLightbox_el.classList.remove('d-none', 'hidden');
        }
      });
      bubble.append(img, removeBtn, nameEl);
    } else {
      const icon = document.createElement('i');
      icon.className = `fa ${this.#mimeToIcon(att.media_type)} terminal-attach-icon`;
      bubble.append(icon, removeBtn, nameEl);
    }

    preview.append(bubble);
    preview.classList.remove('d-none', 'hidden');
  }

  clearAttachmentPreviews() {
    const preview = this.#attachPreview_el;
    if (!preview) {
      return;
    }
    preview.textContent = '';
    preview.classList.add('d-none', 'hidden');
    this.#closeLightbox();
  }

  #createAssistantPanel(): void {
    this.#assistant_el = parseHTML(renderAssistantPanel());

    let elm = this.#assistant_el.querySelector('#terminal_assistant_args');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#assistant_args_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_assistant_args');
    }
    elm = this.#assistant_el.querySelector('#terminal_assistant_args_info');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#assistant_args_info_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_assistant_args_info');
    }
    elm = this.#assistant_el.querySelector('#terminal_assistant_desc');
    if (elm) {
      // $FlowFixMe[incompatible-type]
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
      // $FlowFixMe[incompatible-type]
      this.#promptContainer_els = elms;
    } else {
      throw new ElementNotFoundError('.terminal-prompt-container');
    }
    let elm = this.#userInput_el.querySelector('.terminal-prompt-container.terminal-prompt-interactive');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#interactiveContainer_el = elm;
    } else {
      throw new ElementNotFoundError('.terminal-prompt-container.terminal-prompt-interactive');
    }
    elm = this.#userInput_el.querySelector('.terminal-prompt');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#prompt_el = elm;
    } else {
      throw new ElementNotFoundError('.terminal-prompt');
    }
    elm = this.#userInput_el.querySelector('.terminal-prompt-container.terminal-prompt-info');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#promptInfoContainer_el = elm;
    } else {
      throw new ElementNotFoundError('.terminal-prompt-container.terminal-prompt-info');
    }
    elm = this.#userInput_el.querySelector('#terminal_input');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#input_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_input');
    }
    elm = this.#userInput_el.querySelector('#terminal_shadow_input');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#shadowInput_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_shadow_input');
    }
    elm = this.#userInput_el.querySelector('#terminal_input_multi');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#inputMulti_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_input_multi');
    }
    elm = this.#userInput_el.querySelector('#terminal_input_multi_info');
    if (elm) {
      // $FlowFixMe[incompatible-type]
      this.#inputMultiInfo_el = elm;
    } else {
      throw new ElementNotFoundError('#terminal_input_multi_info');
    }
    this.#input_el.addEventListener('keyup', ev => this.#options.onInputKeyUp(ev));
    this.#input_el.addEventListener('keydown', ev => this.#onInputKeyDown(ev));
    this.#input_el.addEventListener('input', ev => this.#options.onInput(ev));
    this.#inputMulti_el.addEventListener('keyup', ev => this.#options.onInputKeyUp(ev));

    const attachBtn = this.#userInput_el.querySelector('#terminal_ai_attach_btn');
    if (attachBtn instanceof HTMLElement) {
      this.#attachBtn_el = attachBtn;
      const menu = this.#buildAttachMenu();
      attachBtn.insertAdjacentElement('afterend', menu);
      this.#attachMenu_el = menu;
      attachBtn.addEventListener('click', () => this.#toggleAttachMenu());
    }
    this.#updateInputMode(this.#options.inputMode);
  }

  /* EVENTS */
  #onInputKeyDown(ev: KeyboardEvent) {
    if (ev.keyCode === 9) {
      // Press Tab
      ev.preventDefault();
    }
    // Only allow valid responses to questions
    if (ev.keyCode !== 8 && typeof this.#question_active !== 'undefined' && this.#question_active?.values?.length) {
      const cur_value = this.#input_el.value;
      const next_value = `${cur_value}${String.fromCharCode(ev.keyCode)}`.toLowerCase();
      // $FlowFixMe[incompatible-use]
      const is_invalid = this.#question_active.values.filter(item => item.startsWith(next_value)).length === 0;
      if (is_invalid) {
        ev.preventDefault();
      }
    }
  }
}
