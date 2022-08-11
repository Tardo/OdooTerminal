// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.Screen", function (require) {
    "use strict";

    const AbstractScreen = require("terminal.core.abstract.Screen");
    const TemplateManager = require("terminal.core.TemplateManager");
    const Utils = require("terminal.core.Utils");

    /**
     * This class is used to manage 'terminal screen'
     */
    const Screen = AbstractScreen.extend({
        PROMPT: ">",

        _line_selector: ":scope > span .print-table tr, :scope > span",
        _max_lines: 750,
        _max_buff_lines: 100,

        init: function () {
            this._super.apply(this, arguments);
            this._templates = new TemplateManager();
            this._linesCounter = 0;
            this._lazyVacuum = _.debounce(() => this._vacuum(), 650);
            this._buff = [];
            this._wasStart = false;
        },

        start: function () {
            const prom = this._super.apply(this, arguments);
            return new Promise(async (resolve, reject) => {
                try {
                    await prom;
                    this._createScreen();
                    this._createAssistantPanel();
                    await this._createUserInput();
                } catch (err) {
                    return reject(err);
                }
                this._wasStart = true;
                return resolve();
            });
        },

        destroy: function () {
            if (!this._wasStart) {
                return;
            }
            this.$screen.off("keydown");
            this.$input.off("keyup");
            this.$input.off("keydown");
            this.$input.off("input");
        },

        getContent: function () {
            if (!this._wasStart) {
                return "";
            }
            return this.$screen.html();
        },

        scrollDown: function () {
            if (!this._wasStart) {
                return;
            }
            this.$screen[0].scrollTop = this.$screen[0].scrollHeight;
        },

        clean: function () {
            if (!this._wasStart) {
                return;
            }
            this.$screen.html("");
            if (Object.hasOwn(this._options, "onCleanScreen")) {
                this._options.onCleanScreen(this.getContent());
            }
        },

        cleanInput: function () {
            if (!this._wasStart) {
                return;
            }
            this.$input.val("");
            this.cleanShadowInput();
            this.updateAssistantPanelOptions([], -1);
        },

        cleanShadowInput: function () {
            if (!this._wasStart) {
                return;
            }
            this.$shadowInput.val("");
        },

        updateInput: function (str) {
            if (!this._wasStart) {
                return;
            }
            this.$input.val(str);
            this.cleanShadowInput();
        },

        getInputCaretStartPos: function () {
            if (!this._wasStart) {
                return -1;
            }
            return this.$input[0].selectionStart;
        },

        setInputCaretPos: function (start, end) {
            if (!this._wasStart) {
                return;
            }
            this.$input[0].selectionStart = start;
            this.$input[0].selectionEnd = end || start;
        },

        updateShadowInput: function (str) {
            if (!this._wasStart) {
                return;
            }
            this.$shadowInput.val(str);
            // Deferred to ensure that has updated values
            _.defer(() =>
                this.$shadowInput.scrollLeft(this.$input.scrollLeft())
            );
        },

        updateAssistantPanelOptions: function (options, selected_option_index) {
            if (!this._wasStart) {
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
                    }" data-string="${option.string}" href="#">${
                        option.name
                    }</a></li>`
                );
            }
            this.$assistant.html(
                `<ul class="nav nav-pills">${html_options.join("")}</ul>`
            );
        },

        preventLostInputFocus: function (ev) {
            if (!this._wasStart) {
                return;
            }
            const isCKey = ev && (ev.ctrlKey || ev.altKey);
            if (!isCKey) {
                this.focus();
            }
        },

        focus: function () {
            if (!this._wasStart) {
                return;
            }
            this.$input.focus();
        },

        getUserInput: function () {
            if (!this._wasStart) {
                return;
            }
            return this.$input.val();
        },

        /* PRINT */
        flush: function () {
            if (!this._flushing) {
                this._flushing = true;
                window.requestAnimationFrame(this._flush.bind(this));
            }
        },

        _flush: function () {
            if (!this._wasStart) {
                this._flushing = false;
                return;
            }
            this.$screen.append(
                this._buff.splice(0, this._max_buff_lines).join("")
            );
            this._lazyVacuum();
            this.scrollDown();

            if (this._buff.length === 0) {
                if (Object.hasOwn(this._options, "onSaveScreen")) {
                    this._options.onSaveScreen(this.getContent());
                }
                this._flushing = false;
            } else {
                window.requestAnimationFrame(this._flush.bind(this));
            }
        },

        printHTML: function (html) {
            this._buff.push(html);
            this.flush();
        },

        print: function (msg, enl, cls) {
            let scls = cls || "";
            if (!enl) {
                scls = `line-br ${scls}`;
            }
            this._print(msg, scls);
        },

        eprint: function (msg, enl, cls) {
            const emsg = typeof msg === "string" ? Utils.encodeHTML(msg) : msg;
            this.print(emsg, enl, cls);
        },

        printCommand: function (cmd, secured = false) {
            this.eprint(
                this._templates.render(
                    secured ? "PROMPT_CMD_HIDDEN_ARGS" : "PROMPT_CMD",
                    {
                        prompt: this.PROMPT,
                        cmd: cmd,
                    }
                )
            );
        },

        printError: function (error, internal = false) {
            if (!internal) {
                this._print(`[!] ${error}`, "line-br");
                return;
            }
            let error_msg = error;
            if (typeof error === "object" && Object.hasOwn(error, "data")) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                error_msg = this._templates.render("ERROR_MESSAGE", {
                    error_name: Utils.encodeHTML(error.data.name),
                    error_message: Utils.encodeHTML(error.data.message),
                    error_id: error_id,
                    exception_type:
                        error.data.exception_type || error.data.type,
                    context:
                        error.data.context &&
                        JSON.stringify(error.data.context),
                    args:
                        error.data.arguments &&
                        JSON.stringify(error.data.arguments),
                    debug:
                        error.data.debug && Utils.encodeHTML(error.data.debug),
                });
                ++this._errorCount;
            } else if (
                typeof error === "object" &&
                Object.hasOwn(error, "status") &&
                error.status !== "200"
            ) {
                // It's an Odoo/jQuery error report
                const error_id = new Date().getTime();
                error_msg = this._templates.render("ERROR_MESSAGE", {
                    error_name: Utils.encodeHTML(error.statusText),
                    error_message: Utils.encodeHTML(error.statusText),
                    error_id: error_id,
                    exception_type: "Invalid HTTP Request",
                    context: "",
                    args: "",
                    debug: Utils.encodeHTML(error.responseText || ""),
                });
                ++this._errorCount;
            }

            this._print(error_msg, "error_message");
        },

        printTable: function (columns, tbody) {
            this.print(
                this._templates.render("TABLE", {
                    thead: columns.join("</th><th>"),
                    tbody: tbody,
                })
            );
        },

        printRecords: function (model, records) {
            let tbody = "";
            const columns = ["id"];
            const len = records.length;
            for (let x = 0; x < len; ++x) {
                const item = records[x];
                tbody += "<tr>";
                tbody += this._templates.render("TABLE_SEARCH_ID", {
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
                    columns.push(Utils.encodeHTML(field));
                    tbody += `<td>${Utils.encodeHTML(
                        String(item[field])
                    )}</td>`;
                    ++index;
                }
                tbody += "</tr>";
            }
            this.printTable(_.unique(columns), tbody);
        },

        updateInputInfo: function (username, version, host) {
            if (!this._wasStart) {
                return;
            }
            if (username) {
                this.$userInput.find("#terminal-prompt-main").text(username);
            }
            if (version) {
                this.$userInput
                    .find("#terminal-prompt-info-version")
                    .text(version);
            }
            if (host) {
                this.$userInput.find("#terminal-prompt-info-host").text(host);
            }
        },

        showQuestion: function (question_spec) {
            const defer = Utils.defer();
            let [question, values, def_value] = question_spec.split("::");
            if (typeof values !== "undefined") {
                values = values.split(":");
            }
            this._questions.push({
                question: question,
                values: values,
                def_value: def_value,
                defer: defer,
            });
            this.updateQuestions();
            return defer.promise;
        },

        updateQuestions: function () {
            if (
                typeof this._question_active === "undefined" &&
                this._questions.length
            ) {
                this._question_active = this._questions.shift();
                const values = _.map(this._question_active.values, (item) => {
                    if (item === this._question_active.def_value) {
                        return `<strong>${item.toUpperCase()}</strong>`;
                    }
                    return item;
                });
                if (_.isEmpty(values)) {
                    this.$interactiveContainer.html(
                        `<span>${this._question_active.question}</span>`
                    );
                } else {
                    this.$interactiveContainer.html(
                        `<span>${this._question_active.question} [${values.join(
                            "/"
                        )}]</span>`
                    );
                }
                this.$interactiveContainer.removeClass("d-none");
            } else {
                this._question_active = undefined;
                this.$interactiveContainer.html("");
                this.$interactiveContainer.addClass("d-none");
            }
        },

        responseQuestion: function (question, response) {
            question.defer.resolve(
                (_.isEmpty(response) && question.def_value) || response
            );
            this.updateQuestions();
            this.cleanInput();
        },

        rejectQuestion: function (question, reason) {
            question.defer.reject(reason);
            this.updateQuestions();
            this.cleanInput();
        },

        applyStyle: function (name, value) {
            this.$screen.css(name, value);
        },

        /* PRIVATE */
        _formatPrint: function (msg, cls) {
            const msg_type = typeof msg;
            const res = [];
            if (msg_type === "object") {
                if (msg instanceof Text) {
                    res.push(`<span class='line-text ${cls}'>${msg}</span>`);
                } else if (msg instanceof Array) {
                    const l = msg.length;
                    for (let x = 0; x < l; ++x) {
                        res.push(
                            `<span class='line-array ${cls}'>${this._formatPrint(
                                msg[x]
                            )}</span>`
                        );
                    }
                } else {
                    res.push(
                        `<span class='line-object ${cls}'>` +
                            `${this._prettyObjectString(msg)}</span>`
                    );
                }
            } else {
                res.push(`<span class='line-text ${cls}'>${msg}</span>`);
            }
            return res;
        },

        _print: function (msg, cls) {
            const formatted_msgs = this._formatPrint(msg, cls);
            for (const line of formatted_msgs) {
                this.printHTML(line);
            }
        },

        _vacuum: function () {
            if (!this._wasStart) {
                return;
            }

            const $lines = Array.from(
                this.$screen[0].querySelectorAll(this._line_selector)
            );
            const diff = $lines.length - this._max_lines;
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
        },

        _prettyObjectString: function (obj) {
            return Utils.encodeHTML(JSON.stringify(obj, null, 4));
        },

        _createScreen: function () {
            this.$screen = $(
                "<div class='col-sm-12 col-lg-12 col-12' id='terminal_screen' tabindex='-1' />"
            );
            this.$screen.appendTo(this.$container);
            this.$screen.on("keydown", this.preventLostInputFocus.bind(this));
        },

        _createAssistantPanel: function () {
            this.$assistant = $(
                "<div class='col-sm-12 col-lg-12 col-12' id='terminal_assistant' tabindex='-1' />"
            );
            this.$assistant.appendTo(this.$container);
        },

        _createUserInput: function () {
            const host = window.location.host;
            const username = Utils.getUsername();
            const version = Utils.getOdooVersion();
            this.$userInput = $(
                `<div class='terminal-user-input'>
                    <div class='terminal-prompt-container'>
                        <span id="terminal-prompt-main" class='terminal-prompt' title='${username}'>${username}&nbsp;</span>
                        <span>${Utils.encodeHTML(this.PROMPT)}</span>
                    </div>
                    <div class='terminal-prompt-container terminal-prompt-interactive d-none'></div>
                    <div class='rich-input'>
                        <input type='edit' id='terminal_shadow_input' autocomplete='off-term-shadow' spellcheck="false" autocapitalize="off" readonly='readonly'/>
                        <input type='edit' id='terminal_input' autocomplete='off' spellcheck="false" autocapitalize="off" />
                    </div>
                    <div class="terminal-prompt-container terminal-prompt-info">
                        <span id="terminal-prompt-info-version" class='terminal-prompt-info' title='${version}'>${version}</span>
                    </div>
                    <div class="terminal-prompt-container terminal-prompt-host-container">
                        <span id="terminal-prompt-info-host" class='terminal-prompt' title='${host}'>${host}</span>
                    </div>
                </div>`
            );
            this.$userInput.appendTo(this.$container);
            this.$promptContainers = this.$userInput.find(
                ".terminal-prompt-container"
            );
            this.$interactiveContainer = this.$userInput.find(
                ".terminal-prompt-container.terminal-prompt-interactive"
            );
            this.$prompt = this.$promptContainers.find(".terminal-prompt");
            this.$promptInfoContainer = this.$userInput.find(
                ".terminal-prompt-container.terminal-prompt-info"
            );
            this.$input = this.$userInput.find("#terminal_input");
            this.$shadowInput = this.$userInput.find("#terminal_shadow_input");
            this.$input.on("keyup", this._options.onInputKeyUp);
            this.$input.on("keydown", this._onInputKeyDown.bind(this));
            this.$input.on("input", this._options.onInput);
            // Custom color indicator per host
            if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
                this.$promptContainers.css({
                    "background-color": "#adb5bd",
                    color: "black",
                });
                this.$promptInfoContainer.css({
                    "background-color": "#828587",
                    color: "black",
                });
            } else {
                const color_info = Utils.genColorFromString(
                    window.location.host
                );
                this.$promptContainers.css({
                    "background-color": `rgb(${color_info.rgb[0]},${color_info.rgb[1]},${color_info.rgb[2]})`,
                    color: color_info.gv < 0.5 ? "#000" : "#fff",
                });
                let [h, s, v] = Utils.rgb2hsv(
                    color_info.rgb[0] / 255.0,
                    color_info.rgb[1] / 255.0,
                    color_info.rgb[2] / 255.0
                );
                v -= 0.2;
                const [r, g, b] = Utils.hsv2rgb(h, s, v);
                this.$promptInfoContainer.css({
                    "background-color": `rgb(${r * 255},${g * 255},${b * 255})`,
                    color: color_info.gv < 0.5 ? "#000" : "#fff",
                });
            }
        },

        /* EVENTS */
        _onInputKeyDown: function (ev) {
            if (ev.keyCode === 9) {
                // Press Tab
                ev.preventDefault();
            }
            // Only allow valid responses to questions
            if (
                ev.keyCode !== 8 &&
                typeof this._question_active !== "undefined" &&
                this._question_active.values.length
            ) {
                const cur_value = ev.target.value;
                const future_value = `${cur_value}${String.fromCharCode(
                    ev.keyCode
                )}`.toLowerCase();
                const is_invalid = _.chain(this._question_active.values)
                    .filter((item) => item.startsWith(future_value))
                    .isEmpty()
                    .value();
                if (is_invalid) {
                    ev.preventDefault();
                }
            }
        },
    });

    return Screen;
});
