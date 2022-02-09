// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
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
                return resolve();
            });
        },

        destroy: function () {
            this.$screen.off("keydown");
            this.$input.off("keyup");
            this.$input.off("keydown");
            this.$input.off("input");
        },

        getContent: function () {
            return this.$screen.html();
        },

        scrollDown: function () {
            this.$screen[0].scrollTop = this.$screen[0].scrollHeight;
        },

        clean: function () {
            this.$screen.html("");
            if (
                Object.prototype.hasOwnProperty.call(
                    this._options,
                    "onCleanScreen"
                )
            ) {
                this._options.onCleanScreen(this.getContent());
            }
        },

        cleanInput: function () {
            this.$input.val("");
            this.cleanShadowInput();
            this.updateAssistantPanelOptions([], -1);
        },

        cleanShadowInput: function () {
            this.$shadowInput.val("");
        },

        updateInput: function (str) {
            this.$input.val(str);
            this.cleanShadowInput();
        },

        getInputCaretStartPos: function () {
            return this.$input[0].selectionStart;
        },

        setInputCaretPos: function (start, end) {
            this.$input[0].selectionStart = start;
            this.$input[0].selectionEnd = end || start;
        },

        updateShadowInput: function (str) {
            this.$shadowInput.val(str);
            // Deferred to ensure that has updated values
            _.defer(() =>
                this.$shadowInput.scrollLeft(this.$input.scrollLeft())
            );
        },

        updateAssistantPanelOptions: function (options, selected_option_index) {
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
            const isCKey = ev && (ev.ctrlKey || ev.altKey);
            if (!isCKey) {
                this.focus();
            }
        },

        focus: function () {
            this.$input.focus();
        },

        getUserInput: function () {
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
            if (!this.$screen || !this.$screen.length) {
                return;
            }
            this.$screen.append(
                this._buff.splice(0, this._max_buff_lines).join("")
            );
            this._lazyVacuum();
            this.scrollDown();

            if (this._buff.length === 0) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        this._options,
                        "onSaveScreen"
                    )
                ) {
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
            if (
                typeof error === "object" &&
                Object.prototype.hasOwnProperty.call(error, "data")
            ) {
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
                Object.prototype.hasOwnProperty.call(error, "status") &&
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

        /**
         * @returns {Promise}
         */
        _createUserInput: function () {
            const host = window.location.host;
            const username = Utils.getUsername();
            const version = Utils.getOdooVersion();
            this.$userInput = $(
                `<div class='d-flex terminal-user-input'>
                    <div class='terminal-prompt-container d-flex'>
                        <span id="terminal-prompt-main" class='terminal-prompt font-weight-bold' title='${username}'>${username}&nbsp;</span>
                        <span>${Utils.encodeHTML(this.PROMPT)}</span>
                    </div>
                    <div class='flex-fill rich-input'>
                        <input type='edit' id='terminal_shadow_input' autocomplete='off-term-shadow' spellcheck="false" autocapitalize="off" readonly='readonly'/>
                        <input type='edit' id='terminal_input' autocomplete='off' spellcheck="false" autocapitalize="off" />
                    </div>
                    <div class="terminal-prompt-info-container d-none d-lg-inline-flex">
                        <span id="terminal-prompt-info-version" class='terminal-prompt-info' title='${version}'>${version}</span>
                    </div>
                    <div class="terminal-prompt-container d-none d-lg-inline-flex">
                        <span id="terminal-prompt-info-host" class='terminal-prompt' title='${host}'>${host}</span>
                    </div>
                </div>`
            );
            this.$userInput.appendTo(this.$container);
            this.$promptContainer = this.$userInput.find(
                ".terminal-prompt-container"
            );
            this.$prompt = this.$promptContainer.find(".terminal-prompt");
            this.$promptInfoContainer = this.$userInput.find(
                ".terminal-prompt-info-container"
            );
            this.$promptInfo = this.$promptContainer.find(
                ".terminal-prompt-info"
            );
            this.$input = this.$userInput.find("#terminal_input");
            this.$shadowInput = this.$userInput.find("#terminal_shadow_input");
            this.$input.on("keyup", this._options.onInputKeyUp);
            this.$input.on("keydown", this._onInputKeyDown.bind(this));
            this.$input.on("input", this._options.onInput);
            // Custom color indicator per host
            if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
                this.$promptContainer.css({
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
                this.$promptContainer.css({
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
        },
    });

    return Screen;
});
