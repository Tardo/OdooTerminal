// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import Recordset from "./recordset";
import {
  renderErrorMessage,
  renderHelpCmd,
  renderPromptCmd,
  renderPromptCmdHiddenArgs,
  renderTable,
  renderTableSearchId,
} from "./template_manager";
import {
  debounce,
  defer,
  encodeHTML,
  genColorFromString,
  hsv2rgb,
  rgb2hsv,
  unique,
} from "./utils";

const PROMPT = ">";
const LINE_SELECTOR = ":scope > span .print-table tr, :scope > span";

export default class Screen {
  #max_lines = 750;
  #max_buff_lines = 100;
  #input_info = {};

  #questions = [];
  #question_active = undefined;

  #lazyVacuum = debounce(() => this.#vacuum(), 650);

  #options = {};
  #buff = [];
  #errorCount = 0;

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
    this.#$screen.off("keydown");
    this.#$input.off("keyup");
    this.#$input.off("keydown");
    this.#$input.off("input");
  }

  getContent() {
    if (!this.#wasStart) {
      return "";
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
    this.#$screen.html("");
    if (Object.hasOwn(this.#options, "onCleanScreen")) {
      this.#options.onCleanScreen(this.getContent());
    }
  }

  cleanInput() {
    if (!this.#wasStart) {
      return;
    }
    this.#$input.val("");
    this.cleanShadowInput();
    this.updateAssistantPanelOptions([], -1);
  }

  cleanShadowInput() {
    if (!this.#wasStart) {
      return;
    }
    this.#$shadowInput.val("");
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
    const html_options = [];
    for (let index in options) {
      index = Number(index);
      const option = options[index];
      html_options.push(
        `<li class="nav-item"><a class="nav-link ${
          option.is_default ? "text-secondary" : ""
        } ${option.is_required ? "text-warning" : ""} ${
          index === selected_option_index ? "bg-info active" : ""
        }" data-string="${option.string}" href="#">${option.name}</a></li>`
      );
    }
    this.$assistant.html(
      `<ul class="nav nav-pills">${html_options.join("")}</ul>`
    );
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
    this.#$screen.append(this.#buff.splice(0, this.#max_buff_lines).join(""));
    this.#lazyVacuum();
    this.scrollDown();

    if (this.#buff.length === 0) {
      if (Object.hasOwn(this.#options, "onSaveScreen")) {
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
      })
    );
  }

  printHTML(html) {
    this.#buff.push(html);
    this.flush();
  }

  print(msg, enl, cls) {
    if (this.__meta?.silent) {
      return;
    }
    let scls = cls || "";
    if (!enl) {
      scls = `line-br ${scls}`;
    }
    this.#print(msg, scls);
  }

  eprint(msg, enl, cls) {
    const emsg = typeof msg === "string" ? encodeHTML(msg) : msg;
    this.print(emsg, enl, cls);
  }

  printCommand(cmd, secured = false) {
    const values = {
      prompt: PROMPT,
      cmd: cmd,
    };
    this.eprint(
      secured ? renderPromptCmdHiddenArgs(values) : renderPromptCmd(values)
    );
  }

  printError(error, internal = false) {
    if (!error) {
      return;
    }
    if (!internal) {
      this.#print(`[!] ${error}`, "line-br");
      return;
    }
    const error_id = new Date().getTime();
    let error_msg = error;
    if (
      typeof error === "object" &&
      Object.hasOwn(error, "data") &&
      Object.hasOwn(error.data, "name")
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
      ++this.#errorCount;
    } else if (
      typeof error === "object" &&
      Object.hasOwn(error, "status") &&
      error.status !== "200"
    ) {
      // It's an Odoo/jQuery error report
      error_msg = renderErrorMessage({
        error_name: encodeHTML(error.statusText),
        error_message: encodeHTML(error.statusText),
        error_id: error_id,
        exception_type: "Invalid HTTP Request",
        context: "",
        args: "",
        debug: encodeHTML(error.responseText || ""),
      });
      ++this.#errorCount;
    } else if (
      typeof error === "object" &&
      Object.hasOwn(error, "data") &&
      Object.hasOwn(error.data, "debug")
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
        debug: encodeHTML(debug_error.data.debug || ""),
      });
      ++this.#errorCount;
    }

    this.#print(error_msg, "error_message");
  }

  printTable(columns, tbody) {
    this.print(
      renderTable({
        thead: columns.join("</th><th>"),
        tbody: tbody,
      })
    );
  }

  printRecords(model, records) {
    let tbody = "";
    const columns = ["id"];
    const len = records.length;
    for (let x = 0; x < len; ++x) {
      const item = records[x];
      tbody += "<tr>";
      tbody += renderTableSearchId({
        id: item.id,
        model: model,
      });
      const keys = Object.keys(item);
      const keys_len = keys.length;
      let index = 0;
      while (index < keys_len) {
        const field = keys[index];
        if (field === "id") {
          ++index;
          continue;
        }
        const item_val = item[field];
        columns.push(encodeHTML(field));
        if (typeof item_val === "object" && item_val.oterm && item_val.binary) {
          tbody += `<td><span class='btn btn-secondary o_terminal_click o_terminal_read_bin_field' data-model='${model}' data-id='${item.id}' data-field='${field}'>Try Read Field</span></td>`;
        } else {
          tbody += `<td>${encodeHTML(String(item_val))}</td>`;
        }
        ++index;
      }
      tbody += "</tr>";
    }
    this.printTable(unique(columns), tbody);
  }

  updateInputInfo(info) {
    Object.assign(this.#input_info, info);
    if (!this.#wasStart) {
      return;
    }
    if (Object.hasOwn(this.#input_info, "username")) {
      this.#$userInput
        .find("#terminal-prompt-main")
        .html(`${this.#input_info.username}&nbsp;`)
        .attr("title", this.#input_info.username);
    }
    if (Object.hasOwn(this.#input_info, "version")) {
      this.#$userInput
        .find("#terminal-prompt-info-version")
        .text(this.#input_info.version)
        .attr("title", this.#input_info.version);
    }
    if (Object.hasOwn(this.#input_info, "host")) {
      this.#$userInput
        .find("#terminal-prompt-info-host")
        .text(this.#input_info.host)
        .attr("title", this.#input_info.host);
      // Custom color indicator per host
      if (
        this.#input_info.host.startsWith("localhost") ||
        this.#input_info.host.startsWith("127.0.0.1")
      ) {
        this.#$promptContainers.css({
          "background-color": "#adb5bd",
          color: "black",
        });
        this.#$promptInfoContainer.css({
          "background-color": "#828587",
          color: "black",
        });
      } else {
        const color_info = genColorFromString(this.#input_info.host);
        this.#$promptContainers.css({
          "background-color": `rgb(${color_info.rgb[0]},${color_info.rgb[1]},${color_info.rgb[2]})`,
          color: color_info.gv < 0.5 ? "#000" : "#fff",
        });
        let [h, s, v] = rgb2hsv(
          color_info.rgb[0] / 255.0,
          color_info.rgb[1] / 255.0,
          color_info.rgb[2] / 255.0
        );
        v -= 0.2;
        const [r, g, b] = hsv2rgb(h, s, v);
        this.#$promptInfoContainer.css({
          "background-color": `rgb(${r * 255},${g * 255},${b * 255})`,
          color: color_info.gv < 0.5 ? "#000" : "#fff",
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
      typeof this.#question_active === "undefined" &&
      this.#questions.length
    ) {
      this.#question_active = this.#questions.shift();
      const values = this.#question_active.values.map((item) => {
        if (item === this.#question_active.def_value) {
          return `<strong>${item.toUpperCase()}</strong>`;
        }
        return item;
      });
      if (values.length === 0) {
        this.#$interactiveContainer.html(
          `<span>${this.#question_active.question}</span>`
        );
      } else {
        this.#$interactiveContainer.html(
          `<span>${this.#question_active.question} [${values.join("/")}]</span>`
        );
      }
      this.#$interactiveContainer.removeClass("d-none hidden");
    } else {
      this.#question_active = undefined;
      this.#$interactiveContainer.html("");
      this.#$interactiveContainer.addClass("d-none hidden");
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
  #formatPrint(msg, cls) {
    const res = [];
    if (typeof msg === "object") {
      if (msg.constructor === Text) {
        res.push(`<span class='line-text ${cls}'>${msg}</span>`);
      } else if (msg instanceof Recordset) {
        this.printRecords(msg.model, msg);
      } else if (msg.constructor === Array) {
        const l = msg.length;
        for (let x = 0; x < l; ++x) {
          res.push(
            `<span class='line-array ${cls}'>${this.#formatPrint(
              msg[x]
            )}</span>`
          );
        }
      } else {
        res.push(
          `<span class='line-object ${cls}'>` +
            `${this.#prettyObjectString(msg)}</span>`
        );
      }
    } else {
      res.push(`<span class='line-text ${cls}'>${msg}</span>`);
    }
    return res;
  }

  #print(msg, cls) {
    const formatted_msgs = this.#formatPrint(msg, cls);
    for (const line of formatted_msgs) {
      this.printHTML(line);
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
          node.querySelector(".print-table tbody:empty") ||
          !node.querySelector(".print-table");
        if (can_be_deleted) {
          node.remove();
        }
      } while (nodes.length);
    }
  }

  #prettyObjectString(obj) {
    return encodeHTML(JSON.stringify(obj, null, 4));
  }

  #createScreen() {
    this.#$screen = $(
      "<div class='col-sm-12 col-lg-12 col-12' id='terminal_screen' tabindex='-1' />"
    );
    this.#$screen.appendTo(this.#$container);
    this.#$screen.on("keydown", this.preventLostInputFocus.bind(this));
  }

  #createAssistantPanel() {
    this.$assistant = $(
      "<div class='col-sm-12 col-lg-12 col-12' id='terminal_assistant' tabindex='-1' />"
    );
    this.$assistant.appendTo(this.#$container);
  }

  #createUserInput() {
    this.#$userInput = $(
      `<div class='terminal-user-input'>
                <div class='terminal-prompt-container'>
                    <span id="terminal-prompt-main" class='terminal-prompt'></span>
                    <span>${encodeHTML(PROMPT)}</span>
                </div>
                <div class='terminal-prompt-container terminal-prompt-interactive d-none hidden'></div>
                <div class='rich-input'>
                    <input type='edit' id='terminal_shadow_input' autocomplete='off-term-shadow' spellcheck="false" autocapitalize="off" readonly='readonly'/>
                    <input type='edit' id='terminal_input' autocomplete='off' spellcheck="false" autocapitalize="off" />
                </div>
                <div class="terminal-prompt-container terminal-prompt-info">
                    <span id="terminal-prompt-info-version" class='terminal-prompt-info'></span>
                </div>
                <div class="terminal-prompt-container terminal-prompt-host-container">
                    <span id="terminal-prompt-info-host" class='terminal-prompt'></span>
                </div>
            </div>`
    );
    this.#$userInput.appendTo(this.#$container);
    this.#$promptContainers = this.#$userInput.find(
      ".terminal-prompt-container"
    );
    this.#$interactiveContainer = this.#$userInput.find(
      ".terminal-prompt-container.terminal-prompt-interactive"
    );
    this.#$prompt = this.#$promptContainers.find(".terminal-prompt");
    this.#$promptInfoContainer = this.#$userInput.find(
      ".terminal-prompt-container.terminal-prompt-info"
    );
    this.#$input = this.#$userInput.find("#terminal_input");
    this.#$shadowInput = this.#$userInput.find("#terminal_shadow_input");
    this.#$input.on("keyup", this.#options.onInputKeyUp);
    this.#$input.on("keydown", this.#onInputKeyDown.bind(this));
    this.#$input.on("input", this.#options.onInput);
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
      typeof this.#question_active !== "undefined" &&
      this.#question_active.values.length
    ) {
      const cur_value = ev.target.value;
      const future_value = `${cur_value}${String.fromCharCode(
        ev.keyCode
      )}`.toLowerCase();
      const is_invalid =
        this.#question_active.values.filter((item) =>
          item.startsWith(future_value)
        ).length === 0;
      if (is_invalid) {
        ev.preventDefault();
      }
    }
  }
}
