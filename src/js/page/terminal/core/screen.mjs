// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

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

export const PROMPT = '>';
export const LINE_SELECTOR = ':scope > span .print-table tr, :scope > span';

export default class Screen {
  #max_lines = 750;
  #max_buff_lines = 100;
  #input_info = {};

  #questions = [];
  #question_active = undefined;

  #lazyVacuum = debounce(() => this.#vacuum(), 650);

  #options = {};
  #buff = [];

  #$container = null;
  #$screen = null;
  #$input = null;
  #$shadowInput = null;
  #$userInput = null;
  #$promptContainers = null;
  #$interactiveContainer = null;
  #$prompt = null;
  #$promptInfoContainer = null;

  #wasStart = false;
  #flushing = false;

  constructor(options, inputInfo) {
    this.#options = options;
    this.updateInputInfo(inputInfo);
  }

  get maxLines() {
    return this.#max_lines;
  }

  start(container) {
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

  getContent() {
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
    this.updateAssistantPanelOptions([], -1);
  }

  cleanShadowInput() {
    if (!this.#wasStart) {
      return;
    }
    this.#$shadowInput.val('');
  }

  updateInput(str) {
    if (!this.#wasStart) {
      return;
    }
    this.#$input.val(str);
    this.cleanShadowInput();
  }

  getInputCaretStartPos() {
    if (!this.#wasStart) {
      return -1;
    }
    return this.#$input[0].selectionStart;
  }

  setInputCaretPos(start, end) {
    if (!this.#wasStart) {
      return;
    }
    this.#$input[0].selectionStart = start;
    this.#$input[0].selectionEnd = end || start;
  }

  updateShadowInput(str) {
    if (!this.#wasStart) {
      return;
    }
    this.#$shadowInput.val(str);
    // Deferred to ensure that has updated values
    // The trick here is to jump to a new frame
    setTimeout(() => {
      this.#$shadowInput.scrollLeft(this.#$input.scrollLeft(), 0);
    }, 1);
  }

  updateAssistantPanelOptions(options, selected_option_index) {
    if (!this.#wasStart) {
      return;
    }

    if (typeof this.#question_active !== 'undefined') {
      this.$assistant_args.html('');
      this.$assistant_desc.html('');
      return;
    }

    const html_options = [];
    for (let index in options) {
      index = Number(index);
      const option = options[index];
      html_options.push(
        renderAssistantArgOptionItem(option, index, selected_option_index),
      );
    }
    this.$assistant_args.html(renderAssistantArgOptionList(html_options));

    if (selected_option_index !== -1 || options.length === 1) {
      const opt =
        options[selected_option_index === -1 ? 0 : selected_option_index];
      if (opt.is_command) {
        this.$assistant_desc.html(opt.description);
      } else {
        this.$assistant_desc.html(`${opt.type}. ${opt.description}`);
      }
    } else {
      this.$assistant_desc.html('');
    }
  }

  preventLostInputFocus(ev) {
    if (!this.#wasStart) {
      return;
    }
    const isCKey = ev && (ev.ctrlKey || ev.altKey);
    if (!isCKey) {
      this.focus();
    }
  }

  focus() {
    if (!this.#wasStart) {
      return;
    }
    this.#$input.focus();
  }

  getUserInput() {
    if (!this.#wasStart) {
      return;
    }
    return this.#$input.val();
  }

  /* PRINT */
  flush() {
    if (!this.#flushing) {
      this.#flushing = true;
      window.requestAnimationFrame(this.#flush.bind(this));
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
      window.requestAnimationFrame(this.#flush.bind(this));
    }
  }

  printHelpSimple(cmd, cmd_def) {
    this.print(
      renderHelpCmd({
        cmd: cmd,
        def: cmd_def.definition,
      }),
    );
  }

  #printHTML(html) {
    this.#buff.push(html);
    this.flush();
  }

  print(msg, enl, cls) {
    if (this.__meta?.silent) {
      return;
    }
    let scls = cls || '';
    if (!enl) {
      scls = `line-br ${scls}`;
    }
    this.#print(msg, scls);
  }

  eprint(msg, enl, cls) {
    const emsg = typeof msg === 'string' ? encodeHTML(msg) : msg;
    this.print(emsg, enl, cls);
  }

  printCommand(cmd, secured = false) {
    const values = {
      prompt: PROMPT,
      cmd: cmd,
    };
    this.eprint(
      secured ? renderPromptCmdHiddenArgs(values) : renderPromptCmd(values),
    );
  }

  printError(error, internal = false) {
    if (!error) {
      return;
    }
    if (!internal) {
      this.#print(`[!] ${error}`, 'line-br');
      return;
    }
    const error_id = new Date().getTime();
    let error_msg = error;
    if (
      typeof error === 'object' &&
      Object.hasOwn(error, 'data') &&
      Object.hasOwn(error.data, 'name')
    ) {
      // It's an Odoo error report
      error_msg = renderErrorMessage({
        error_name: encodeHTML(error.data.name),
        error_message: encodeHTML(error.data.message),
        error_id: error_id,
        exception_type: error.data.exception_type || error.data.type,
        context: error.data.context && JSON.stringify(error.data.context),
        args: error.data.arguments && JSON.stringify(error.data.arguments),
        debug: error.data.debug && encodeHTML(error.data.debug),
      });
    } else if (
      typeof error === 'object' &&
      Object.hasOwn(error, 'status') &&
      error.status !== '200'
    ) {
      // It's an Odoo/jQuery error report
      error_msg = renderErrorMessage({
        error_name: encodeHTML(error.statusText),
        error_message: encodeHTML(error.statusText),
        error_id: error_id,
        exception_type: 'Invalid HTTP Request',
        context: '',
        args: '',
        debug: encodeHTML(error.responseText || ''),
      });
    } else if (
      typeof error === 'object' &&
      Object.hasOwn(error, 'data') &&
      Object.hasOwn(error.data, 'debug')
    ) {
      const debug_error = JSON.parse(error.data.debug).error;
      error_msg = renderErrorMessage({
        error_name: encodeHTML(debug_error.data.name),
        error_message: encodeHTML(debug_error.data.message),
        error_id: error_id,
        exception_type: encodeHTML(debug_error.message),
        context:
          debug_error.data.context && JSON.stringify(debug_error.data.context),
        args:
          debug_error.data.arguments &&
          JSON.stringify(debug_error.data.arguments),
        debug: encodeHTML(debug_error.data.debug || ''),
      });
    }

    this.#print(error_msg, 'error_message');
  }

  printTable(columns, rows, cls) {
    this.print(renderTable(columns, rows, cls));
  }

  updateInputInfo(info) {
    Object.assign(this.#input_info, info);
    if (!this.#wasStart) {
      return;
    }
    if (Object.hasOwn(this.#input_info, 'username')) {
      this.#$userInput
        .find('#terminal-prompt-main')
        .html(`${this.#input_info.username}&nbsp;`)
        .attr('title', this.#input_info.username);
    }
    if (Object.hasOwn(this.#input_info, 'version')) {
      this.#$userInput
        .find('#terminal-prompt-info-version')
        .text(this.#input_info.version)
        .attr('title', this.#input_info.version);
    }
    if (Object.hasOwn(this.#input_info, 'host')) {
      this.#$userInput
        .find('#terminal-prompt-info-host')
        .text(this.#input_info.host)
        .attr('title', this.#input_info.host);
      // Custom color indicator per host
      if (
        this.#input_info.host.startsWith('localhost') ||
        this.#input_info.host.startsWith('127.0.0.1')
      ) {
        this.#$promptContainers.css({
          'background-color': '#adb5bd',
          color: 'black',
        });
        this.#$promptInfoContainer.css({
          'background-color': '#828587',
          color: 'black',
        });
      } else {
        const color_info = genColorFromString(this.#input_info.host);
        this.#$promptContainers.css({
          'background-color': `rgb(${color_info.rgb[0]},${color_info.rgb[1]},${color_info.rgb[2]})`,
          color: color_info.gv < 0.5 ? '#000' : '#fff',
        });
        // eslint-disable-next-line prefer-const
        let [h, s, v] = rgb2hsv(
          color_info.rgb[0] / 255.0,
          color_info.rgb[1] / 255.0,
          color_info.rgb[2] / 255.0,
        );
        v -= 0.2;
        const [r, g, b] = hsv2rgb(h, s, v);
        this.#$promptInfoContainer.css({
          'background-color': `rgb(${r * 255},${g * 255},${b * 255})`,
          color: color_info.gv < 0.5 ? '#000' : '#fff',
        });
      }
    }
  }

  getQuestionActive() {
    return this.#question_active;
  }

  showQuestion(question, values, def_value) {
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
    if (
      typeof this.#question_active === 'undefined' &&
      this.#questions.length
    ) {
      this.#question_active = this.#questions.shift();
      const values = this.#question_active.values.map(item => {
        if (item === this.#question_active.def_value) {
          return `<strong>${item.toUpperCase()}</strong>`;
        }
        return item;
      });
      if (values.length === 0) {
        this.#$interactiveContainer.html(
          `<span>${this.#question_active.question}</span>`,
        );
      } else {
        this.#$interactiveContainer.html(
          `<span>${this.#question_active.question} [${values.join(
            '/',
          )}]</span>`,
        );
      }
      this.#$interactiveContainer.removeClass('d-none hidden');
    } else {
      this.#question_active = undefined;
      this.#$interactiveContainer.html('');
      this.#$interactiveContainer.addClass('d-none hidden');
    }
  }

  responseQuestion(question, response) {
    question.defer.resolve((!response && question.def_value) || response);
    this.updateQuestions();
    this.cleanInput();
  }

  rejectQuestion(question, reason) {
    question.defer.reject(reason);
    this.updateQuestions();
    this.cleanInput();
  }

  applyStyle(name, value) {
    this.#$screen.css(name, value);
  }

  /* PRIVATE */
  #print(msg, cls) {
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
        const can_be_deleted =
          node.querySelector('.print-table tbody:empty') ||
          !node.querySelector('.print-table');
        if (can_be_deleted) {
          node.remove();
        }
      } while (nodes.length);
    }
  }

  #createScreen() {
    this.#$screen = $(renderScreen());
    this.#$screen.appendTo(this.#$container);
    this.#$screen.on('keydown', this.preventLostInputFocus.bind(this));
  }

  #createAssistantPanel() {
    this.$assistant = $(renderAssistantPanel());
    this.$assistant_args = this.$assistant.find('#terminal_assistant_args');
    this.$assistant_desc = this.$assistant.find('#terminal_assistant_desc');
    this.$assistant.appendTo(this.#$container);
  }

  #createUserInput() {
    this.#$userInput = $(renderUserInput(PROMPT));
    this.#$userInput.appendTo(this.#$container);
    this.#$promptContainers = this.#$userInput.find(
      '.terminal-prompt-container',
    );
    this.#$interactiveContainer = this.#$userInput.find(
      '.terminal-prompt-container.terminal-prompt-interactive',
    );
    this.#$prompt = this.#$promptContainers.find('.terminal-prompt');
    this.#$promptInfoContainer = this.#$userInput.find(
      '.terminal-prompt-container.terminal-prompt-info',
    );
    this.#$input = this.#$userInput.find('#terminal_input');
    this.#$shadowInput = this.#$userInput.find('#terminal_shadow_input');
    this.#$input.on('keyup', this.#options.onInputKeyUp);
    this.#$input.on('keydown', this.#onInputKeyDown.bind(this));
    this.#$input.on('input', this.#options.onInput);
  }

  /* EVENTS */
  #onInputKeyDown(ev) {
    if (ev.keyCode === 9) {
      // Press Tab
      ev.preventDefault();
    }
    // Only allow valid responses to questions
    if (
      ev.keyCode !== 8 &&
      typeof this.#question_active !== 'undefined' &&
      this.#question_active.values.length
    ) {
      const cur_value = ev.target.value;
      const next_value = `${cur_value}${String.fromCharCode(
        ev.keyCode,
      )}`.toLowerCase();
      const is_invalid =
        this.#question_active.values.filter(item => item.startsWith(next_value))
          .length === 0;
      if (is_invalid) {
        ev.preventDefault();
      }
    }
  }
}
