// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.Screen", function (require) {
    "use strict";

    const AbstractScreen = require("terminal.core.abstract.Screen");
    const TemplateManager = require("terminal.core.TemplateManager");
    const utils = require("terminal.core.Utils");

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
            this._super.apply(this, arguments);
            this._createScreen();
            this._createUserInput();
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
            if ("onCleanScreen" in this._options) {
                this._options.onCleanScreen(this.getContent());
            }
        },

        cleanInput: function () {
            this.$input.val("");
            this.cleanShadowInput();
        },

        cleanShadowInput: function () {
            this.$shadowInput.val("");
        },

        updateInput: function (str) {
            this.$input.val(str);
            this.cleanShadowInput();
        },

        updateShadowInput: function (str) {
            this.$shadowInput.val(str);
            // Deferred to ensure that has updated values
            _.defer(() =>
                this.$shadowInput.scrollLeft(this.$input.scrollLeft())
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
            // Make browser happy... split buffer
            this.$screen.append(
                this._buff.splice(0, this._max_buff_lines).join("")
            );
            this._lazyVacuum();
            this.scrollDown();

            if (this._buff.length === 0) {
                if ("onSaveScreen" in this._options) {
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

        eprint: function (msg, enl) {
            this.print(utils.encodeHTML(msg), enl);
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
                "data" in error &&
                "exception_type" in error.data
            ) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                error_msg = this._templates.render("ERROR_MESSAGE", {
                    error_name: utils.encodeHTML(error.data.name),
                    error_message: utils.encodeHTML(error.data.message),
                    error_id: error_id,
                    exception_type: error.data.exception_type,
                    context: JSON.stringify(error.data.context),
                    args: JSON.stringify(error.data.arguments),
                    debug: utils.encodeHTML(error.data.debug),
                });
                ++this._errorCount;
            } else if (
                typeof error === "object" &&
                "data" in error &&
                "type" in error.data
            ) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                error_msg = this._templates.render("ERROR_MESSAGE", {
                    error_name: utils.encodeHTML(error.data.objects[1]),
                    error_message: utils.encodeHTML(error.message),
                    error_id: error_id,
                    exception_type: error.data.type,
                    context: "",
                    args: "",
                    debug: utils.encodeHTML(error.data.debug),
                });
                ++this._errorCount;
            } else if (
                typeof error === "object" &&
                "status" in error &&
                error.status !== "200"
            ) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                error_msg = this._templates.render("ERROR_MESSAGE", {
                    error_name: utils.encodeHTML(error.statusText),
                    error_message: utils.encodeHTML(error.statusText),
                    error_id: error_id,
                    exception_type: "Invalid HTTP Request",
                    context: "",
                    args: "",
                    debug: utils.encodeHTML(error.responseText),
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
                    columns.push(field);
                    tbody += `<td>${item[field]}</td>`;
                    ++index;
                }
                tbody += "</tr>";
            }
            this.printTable(_.unique(columns), tbody);
        },

        /* PRIVATE */
        _print: function (msg, cls) {
            const msg_type = typeof msg;
            if (msg_type === "object") {
                if (msg instanceof Text) {
                    this.printHTML(
                        `<span class='line-text ${cls}'>${msg}</span>`
                    );
                } else if (msg instanceof Array) {
                    const l = msg.length;
                    for (let x = 0; x < l; ++x) {
                        this.printHTML(
                            `<span class='line-array ${cls}'>${msg[x]}</span>`
                        );
                    }
                } else {
                    this.printHTML(
                        `<span class='line-object ${cls}'>` +
                            `${this._prettyObjectString(msg)}</span>`
                    );
                }
            } else {
                this.printHTML(`<span class='line-text ${cls}'>${msg}</span>`);
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
            return utils.encodeHTML(JSON.stringify(obj, null, 4));
        },

        _createScreen: function () {
            this.$screen = $(
                "<div class='col-sm-12 col-lg-12 col-12' id='terminal_screen' tabindex='-1' />"
            );
            this.$screen.appendTo(this.$container);
            this.$screen.on("keydown", this.preventLostInputFocus.bind(this));
        },

        _createUserInput: function () {
            const to_inject = $(
                "<div class='d-flex terminal-user-input'>" +
                    "<input class='terminal-prompt' readonly='readonly'/>" +
                    "<div class='flex-fill rich-input'>" +
                    "<input type='edit' id='terminal_shadow_input' autocomplete='off-term-shadow' readonly='readonly'/>" +
                    "<input type='edit' id='terminal_input' autocomplete='off-term' />" +
                    "</div>" +
                    "</div>"
            );
            to_inject.appendTo(this.$container);
            this.$prompt = to_inject.find(".terminal-prompt");
            this.$input = to_inject.find("#terminal_input");
            this.$shadowInput = to_inject.find("#terminal_shadow_input");
            this.$prompt.val(this.PROMPT);
            this.$input.on("keyup", this._options.onInputKeyUp);
            this.$input.on("keydown", this._onInputKeyDown.bind(this));
            this.$input.on("input", this._options.onInput);
            // Custom color indicator per host
            const host = window.location.host;
            if (
                !host.startsWith("localhost") &&
                !host.startsWith("127.0.0.1")
            ) {
                const [r, g, b] = utils.hex2rgb(
                    utils.genHash(window.location.host)
                );
                this.$prompt.css("background-color", `rgb(${r},${g},${b})`);
                const gv =
                    1 -
                    (0.2126 * (r / 255) +
                        0.7152 * (g / 255) +
                        0.0722 * (b / 255));
                this.$prompt.css({
                    background_color: `rgb(${r},${g},${b})`,
                    color: gv < 0.5 ? "#000" : "#fff",
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
