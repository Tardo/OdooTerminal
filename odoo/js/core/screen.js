// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.core.Screen", function(require) {
    "use strict";

    const AbstractScreen = require("terminal.core.abstract.Screen");
    const TemplateManager = require("terminal.core.TemplateManager");
    const encodeHTML = require("terminal.core.Utils").encodeHTML;

    /**
     * This class is used to manage 'terminal screen'
     */
    const Screen = AbstractScreen.extend({
        PROMPT: ">",

        init: function() {
            this._super.apply(this, arguments);
            this._templates = new TemplateManager();
        },

        start: function() {
            this._super.apply(this, arguments);
            this._createScreen();
            this._createUserInput();
        },

        destroy: function() {
            this.$screen.off("keydown");
            this.$input.off("keyup");
            this.$input.off("keydown");
            this.$input.off("input");
        },

        getContent: function() {
            return this.$screen.html();
        },

        scrollDown: function() {
            this.$screen[0].scrollTop = this.$screen[0].scrollHeight;
        },

        clean: function() {
            this.$screen.html("");
            if ("onCleanScreen" in this._options) {
                this._options.onCleanScreen(this.getContent());
            }
        },

        cleanInput: function() {
            this.$input.val("");
            this.cleanShadowInput();
        },

        cleanShadowInput: function() {
            this.$shadowInput.val("");
        },

        updateInput: function(str) {
            this.$input.val(str);
            this.cleanShadowInput();
        },

        updateShadowInput: function(str) {
            this.$shadowInput.val(str);
            this.$shadowInput.scrollLeft(this.$input.scrollLeft());
        },

        preventLostInputFocus: function(ev) {
            const isCKey = ev && (ev.ctrlKey || ev.altKey);
            if (!isCKey) {
                this.focus();
            }
        },

        focus: function() {
            this.$input.focus();
        },

        getUserInput: function() {
            return this.$input.val();
        },

        /* PRINT */
        printHTML: function(html, nostore) {
            this.$screen.append(html);
            this.scrollDown();
            if (!nostore && "onSaveScreen" in this._options) {
                this._options.onSaveScreen(this.getContent());
            }
        },

        print: function(msg, enl, cls) {
            const msg_type = typeof msg;
            if (msg_type === "object") {
                if (msg instanceof Text) {
                    this.printHTML(
                        $(msg).wrap(
                            `<span class='line-text ${cls || ""}'></span>`
                        )
                    );
                } else if (msg instanceof Array) {
                    const l = msg.length;
                    let html_to_print = "";
                    for (let x = 0; x < l; ++x) {
                        html_to_print += `<span class='line-array ${cls ||
                            ""}'>${msg[x]}</span><br>`;
                    }
                    this.printHTML(html_to_print);
                } else {
                    this.printHTML(
                        `<span class='line-object ${cls || ""}'>` +
                            `${this._prettyObjectString(msg)}</span><br>`
                    );
                }
            } else {
                this.printHTML(
                    `<span class='line-text ${cls || ""}'>${msg}</span>`
                );
            }
            if (!enl) {
                this.printHTML("<br>");
            }
        },

        eprint: function(msg, enl) {
            this.print(document.createTextNode(msg), enl);
        },

        printCommand: function(cmd, secured = false) {
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

        printError: function(error, internal = false) {
            if (!internal) {
                this.print(`[!] ${error}`);
                return;
            }
            if (
                typeof error === "object" &&
                "data" in error &&
                "exception_type" in error.data
            ) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                this.print(
                    this._templates.render("ERROR_MESSAGE", {
                        error_name: encodeHTML(error.data.name),
                        error_message: encodeHTML(error.data.message),
                        error_id: error_id,
                        exception_type: error.data.exception_type,
                        context: JSON.stringify(error.data.context),
                        args: JSON.stringify(error.data.arguments),
                        debug: encodeHTML(error.data.debug),
                    }),
                    false,
                    "error_message"
                );
                ++this._errorCount;
            } else if (
                typeof error === "object" &&
                "data" in error &&
                "type" in error.data
            ) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                this.print(
                    this._templates.render("ERROR_MESSAGE", {
                        error_name: encodeHTML(error.data.objects[1]),
                        error_message: encodeHTML(error.message),
                        error_id: error_id,
                        exception_type: error.data.type,
                        context: "",
                        args: "",
                        debug: encodeHTML(error.data.debug),
                    }),
                    false,
                    "error_message"
                );
                ++this._errorCount;
            } else if (
                typeof error === "object" &&
                "status" in error &&
                error.status !== "200"
            ) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                this.print(
                    this._templates.render("ERROR_MESSAGE", {
                        error_name: encodeHTML(error.statusText),
                        error_message: encodeHTML(error.statusText),
                        error_id: error_id,
                        exception_type: "Invalid HTTP Request",
                        context: "",
                        args: "",
                        debug: encodeHTML(error.responseText),
                    }),
                    false,
                    "error_message"
                );
                ++this._errorCount;
            } else {
                this.print(error, false, "error_message");
            }
        },

        printTable: function(columns, tbody) {
            this.print(
                this._templates.render("TABLE", {
                    thead: columns.join("</th><th>"),
                    tbody: tbody,
                })
            );
        },

        /* PRIVATE */
        _prettyObjectString: function(obj) {
            return encodeHTML(JSON.stringify(obj, null, 4));
        },

        _createScreen: function() {
            this.$screen = $(
                "<div class='col-sm-12 col-lg-12 col-12' id='terminal_screen' tabindex='-1' />"
            );
            this.$screen.appendTo(this.$container);
            this.$screen.on("keydown", this.preventLostInputFocus.bind(this));
        },

        _createUserInput: function() {
            const to_inject = $(
                "<div class='d-flex terminal-user-input'>" +
                    "<input class='terminal-prompt' readonly='readonly'/>" +
                    "<div class='flex-fill rich-input'>" +
                    "<input type='edit' id='terminal_shadow_input' autocomplete='off' readonly='readonly'/>" +
                    "<input type='edit' id='terminal_input' autocomplete='off' />" +
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
        },

        /* EVENTS */
        _onInputKeyDown: function(ev) {
            if (ev.keyCode === 9) {
                // Press Tab
                ev.preventDefault();
            }
        },
    });

    return Screen;
});
