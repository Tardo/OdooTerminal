// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.Terminal", function(require) {
    "use strict";

    const core = require("web.core");
    const session = require("web.session");
    const Class = require("web.Class");
    const AbstractTerminal = require("terminal.AbstractTerminal");

    const QWeb = core.qweb;

    const TerminalStorage = AbstractTerminal.storage.extend({
        getItem: function(item) {
            return JSON.parse(sessionStorage.getItem(item)) || undefined;
        },

        setItem: function(item, value) {
            try {
                return sessionStorage.setItem(item, JSON.stringify(value));
            } catch (e) {
                if (e.name !== "QuotaExceededError") {
                    throw e;
                }
                this._parent._printHTML(
                    "<span style='color:navajowhite'>" +
                        "<strong>WARNING:</strong> Clear the " +
                        "<b class='o_terminal_click o_terminal_cmd' " +
                        "data-cmd='clear screen' style='color:orange;'>screen</b> " +
                        "or/and " +
                        "<b class='o_terminal_click o_terminal_cmd' " +
                        "data-cmd='clear history' style='color:orange;'>" +
                        "history</b> " +
                        "to free storage space. Browser <u>Storage Quota Exceeded</u>" +
                        " 😭 </strong><br>",
                    true
                );
            }

            return false;
        },

        removeItem: function(item) {
            return sessionStorage.removeItem(item) || undefined;
        },
    });

    const TerminalLongPolling = AbstractTerminal.longpolling.extend({
        setVerbose: function(status) {
            if (status) {
                this._parent._storage.setItem(
                    "terminal_longpolling_mode",
                    "verbose"
                );
            } else {
                this._parent._storage.removeItem("terminal_longpolling_mode");
            }
        },

        isVerbose: function() {
            return this._parent._storage.getItem("terminal_longpolling_mode");
        },

        //
        _onBusNotification: function(notifications) {
            if (this.isVerbose()) {
                this._parent.trigger_up(
                    "longpolling_notification",
                    notifications
                );
            }
        },
    });

    /**
     * This class is used to parse terminal command parameters.
     */
    const ParameterReader = Class.extend({
        _validators: {},
        _formatters: {},
        _regexSanitize: null,
        _regexParams: null,

        init: function() {
            this._validators = {
                s: this._validateString,
                i: this._validateInt,
            };
            this._formatters = {
                s: this._formatString,
                i: this._formatInt,
            };
            this._regexSanitize = new RegExp("'", "g");
            this._regexParams = new RegExp(
                /(["'])((?:(?=(\\?))\2.)*?)\1|[^\s]+/,
                "g"
            );
        },

        /**
         * Sanitize command parameters to use when invoke commands.
         * @param {String} cmdRaw
         * @param {Object} cmdDef
         * @returns {Object}
         */
        parse: function(cmdRaw, cmdDef) {
            const match = this._regexParams[Symbol.matchAll](cmdRaw);
            let scmd = Array.from(match, x => x[0]);
            const cmd = scmd[0];
            scmd = scmd.slice(1);
            const rawParams = scmd.join(" ");
            let params = _.map(scmd, item => {
                let nvalue = item;
                if (item[0] === '"' || item[0] === "'") {
                    nvalue = item.substr(1, item.length - 2);
                }
                return this._sanitizeString(nvalue);
            });

            params = this.validateAndFormat(cmdDef.args, params);

            return {
                cmd: cmd,
                rawParams: rawParams,
                params: params,
            };
        },

        /**
         * Check if the parameter type correspond with the expected type.
         * @param {Array} args
         * @param {Array} params
         * @returns {Boolean}
         */
        validateAndFormat: function(args, params) {
            if (!args || !args.length) {
                return params;
            }
            const formattedParams = [];
            let optionalMode = false;
            for (let i = 0; i < args.length; ++i) {
                let carg = args[i];
                if (carg === "?") {
                    optionalMode = true;
                    carg = args[++i];
                }

                const curParamIndex = formattedParams.length;
                const isInvalidNO =
                    !optionalMode && curParamIndex >= params.length;
                const isInvalidO =
                    curParamIndex < params.length &&
                    !this._validators[carg](params[curParamIndex]);
                if (isInvalidNO || isInvalidO) {
                    throw new Error("Invalid command parameters");
                }

                formattedParams.push(
                    this._formatters[carg](params[curParamIndex])
                );
            }

            return formattedParams;
        },

        /**
         * Replace all quotes to double-quotes.
         * @param {String} str
         * @returns {String}
         */
        _sanitizeString: function(str) {
            return str.replace(this._regexSanitize, '"');
        },

        /**
         * Test if is an string.
         * @param {String} param
         * @returns {Boolean}
         */
        _validateString: function(param) {
            return Number(param) !== parseInt(param, 10);
        },

        /**
         * Test if is an integer.
         * @param {String} param
         * @returns {Boolean}
         */
        _validateInt: function(param) {
            return Number(param) === parseInt(param, 10);
        },

        /**
         * Format value to string
         * @param {String} param
         * @returns {String}
         */
        _formatString: function(param) {
            return param;
        },

        /**
         * Format value to integer
         * @param {String} param
         * @returns {Number}
         */
        _formatInt: function(param) {
            return (param && Number(param)) || false;
        },
    });

    const Terminal = AbstractTerminal.terminal.extend({
        custom_events: {},
        events: {
            "keyup #terminal_input": "_onInputKeyUp",
            "keydown #terminal_input": "_onInputKeyDown",
            "keydown #terminal_screen": "_preventLostInputFocus",
            "click .o_terminal_cmd": "_onClickTerminalCommand",
            "click .terminal-screen-icon-maximize": "_onClickToggleMaximize",
        },

        SCREEN_HEIGHT: "40vh",
        SCREEN_MAX_HEIGHT: "90vh",
        BTN_BCKG_COLOR_ACTIVE: "#555",

        _parameterReader: null,

        _runningCommandsCount: 0,
        _errorCount: 0,

        _initGuard: function() {
            if (typeof this._observer === "undefined") {
                // FIXME: Obversers !== Performance :(
                this._observer = new MutationObserver(
                    this._injectTerminal.bind(this)
                );
                this._observer.observe(document.body, {childList: true});
            }
        },

        _injectTerminal: function() {
            const $terms = $("body").find(".o_terminal");
            if ($terms.length > 1) {
                const toRemove = $terms.filter(":not(:first-child)");
                toRemove.remove();
            } else if (!$terms.length) {
                $(QWeb.render("terminal")).prependTo("body");
                this.setElement($("body").find("#terminal"));
                this.start();
            }
        },

        init: function() {
            this._super.apply(this, arguments);

            this._storage = new TerminalStorage(this);
            this._longpolling = new TerminalLongPolling(this);
            this._parameterReader = new ParameterReader();

            this._rawTerminal = QWeb.render("terminal");

            this._lazyStorageTerminalScreen = _.debounce(
                function() {
                    this._storage.setItem("terminal_screen", this.$term.html());
                }.bind(this),
                350
            );

            core.bus.on("keydown", this, this._onCoreKeyDown);
            core.bus.on("click", this, this._onCoreClick);
            // NOTE: Listen messages from 'content script'
            window.addEventListener(
                "message",
                this._onWindowMessage.bind(this),
                true
            );
            // NOTE-END

            this._injectTerminal();
            this._initGuard();
        },

        start: function() {
            this._super.apply(this, arguments);

            // Custom Events
            this.$el[0].addEventListener("toggle", this.do_toggle.bind(this));

            this.$(".terminal-prompt").val(this.PROMPT);

            this.$input = this.$("#terminal_input");
            this.$shadowInput = this.$("#terminal_shadow_input");
            this.$term = this.$("#terminal_screen");
            this.$runningCmdCount = this.$("#terminal_running_cmd_count");

            const cachedScreen = this._storage.getItem("terminal_screen");
            if (_.isUndefined(cachedScreen)) {
                this._printWelcomeMessage();
                this.print("");
            } else {
                this._printHTML(cachedScreen);
                requestAnimationFrame(() => {
                    this.$term[0].scrollTop = this.$term[0].scrollHeight;
                });
            }
            const cachedHistory = this._storage.getItem("terminal_history");
            if (!_.isUndefined(cachedHistory)) {
                this._inputHistory = cachedHistory;
                this._searchHistoryIter = this._inputHistory.length;
            }

            const isMaximized = this._storage.getItem("screen_maximized");
            if (isMaximized) {
                this.$term.css("height", this.SCREEN_MAX_HEIGHT);
                this.$(".terminal-screen-icon-maximize").css(
                    "backgroundColor",
                    this.BTN_BCKG_COLOR_ACTIVE
                );
            } else {
                this.$term.css("height", this.SCREEN_HEIGHT);
            }
        },

        destroy: function() {
            if (typeof this._observer !== "undefined") {
                this._observer.disconnect();
            }
            window.removeEventListener("message", this._onWindowMessage, true);
            core.bus.off("keydown", this, this._onCoreKeyDown);
            core.bus.off("click", this, this._onCoreClick);
            this._super.apply(this, arguments);
        },

        /* PRINT */
        _printHTML: function(html, nostore) {
            this.$term.append(html);
            this.$term[0].scrollTop = this.$term[0].scrollHeight;
            if (!nostore) {
                this._lazyStorageTerminalScreen();
            }
        },

        _prettyObjectString: function(obj) {
            return JSON.stringify(obj, null, 4);
        },
        print: function(msg, enl, cls) {
            const msg_type = typeof msg;
            if (msg_type === "object") {
                if (msg instanceof Text) {
                    this._printHTML(
                        $(msg).wrap(
                            `<span class='line-text ${cls || ""}'></span>`
                        )
                    );
                } else if (msg instanceof Array) {
                    const l = msg.length;
                    let htmlToPrint = "";
                    for (let x = 0; x < l; ++x) {
                        htmlToPrint += `<span class='line-array ${cls || ""}'>${
                            msg[x]
                        }</span><br>`;
                    }
                    this._printHTML(htmlToPrint);
                } else {
                    this._printHTML(
                        `<span class='line-object ${cls || ""}'>` +
                            `${this._prettyObjectString(msg)}</span><br>`
                    );
                }
            } else {
                this._printHTML(
                    `<span class='line-text ${cls || ""}'>${msg}</span>`
                );
            }
            if (!enl) {
                this._printHTML("<br>");
            }
        },

        eprint: function(msg, enl) {
            this.print(document.createTextNode(msg), enl);
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
                        error_name: this._encodeHTML(error.data.name),
                        error_message: this._encodeHTML(error.data.message),
                        error_id: error_id,
                        exception_type: error.data.exception_type,
                        context: JSON.stringify(error.data.context),
                        args: JSON.stringify(error.data.arguments),
                        debug: this._encodeHTML(error.data.debug),
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

        /* BASIC FUNCTIONS */
        clean: function() {
            this.$term.html("");
            this._storage.removeItem("terminal_screen");
        },

        cleanInput: function() {
            this.$input.val("");
        },

        cleanInputHistory: function() {
            this._inputHistory = [];
            this._storage.removeItem("terminal_screen");
        },

        registerCommand: function(cmd, cmdDef) {
            this._registeredCmds[cmd] = _.extend(
                {
                    definition: "Undefined command",
                    callback: this._fallbackExecuteCommand,
                    detail:
                        "This command hasn't a properly detailed information",
                    syntaxis: "Unknown",
                    args: "",
                    secured: false,
                    aliases: [],
                },
                cmdDef
            );
        },

        executeCommand: function(cmdRaw, store = true) {
            const cmd = cmdRaw || "";
            const cmdSplit = cmdRaw.split(" ");
            const cmdName = cmdSplit[0];
            if (!cmdName) {
                return false;
            }
            let cmdDef = this._registeredCmds[cmdName];

            // Stop execution if the command doesn't exists
            if (!cmdDef) {
                [, cmdDef] = this._searchCommandDefByAlias(cmdName);
                if (!cmdDef) {
                    const similar_cmd = this._searchSimiliarCommand(cmdName);
                    if (similar_cmd) {
                        this.print(
                            this._templates.render("UNKNOWN_COMMAND", {
                                cmd: similar_cmd,
                                params: cmdSplit.slice(1),
                            })
                        );
                    } else {
                        this.eprint("Unknown command.");
                    }
                    if (store) {
                        this._storeUserInput(cmd);
                    }
                    this.cleanInput();
                    return false;
                }
            }

            let scmd = {};
            try {
                scmd = this._parameterReader.parse(cmd, cmdDef);
            } catch (err) {
                this.eprint(
                    this._templates.render("PROMPT_CMD", {
                        prompt: this.PROMPT,
                        cmd: cmd,
                    })
                );
                this.printError(
                    `<span class='o_terminal_click ` +
                        `o_terminal_cmd' data-cmd='help ${cmdName}'>` +
                        `${err.message}!</span>`
                );
                if (store) {
                    this._storeUserInput(cmd);
                }
                this.cleanInput();
                return false;
            }
            let template = "PROMPT_CMD";
            if (cmdDef.secured) {
                template = "PROMPT_CMD_HIDDEN_ARGS";
            } else if (store) {
                this._storeUserInput(cmd);
            }
            this.eprint(
                this._templates.render(template, {
                    prompt: this.PROMPT,
                    cmd: cmdRaw,
                })
            );
            this.cleanInput();
            this._processCommandJob(scmd, cmdDef);
        },

        /* VISIBILIY */
        do_show: function() {
            if (!this._isTerminalVisible()) {
                this.$el.animate({top: "0"});
                this.$input.focus();
            }
        },

        do_hide: function() {
            if (this._isTerminalVisible()) {
                this.$el.animate({top: "-100%"});
            }
        },

        do_toggle: function() {
            if (this._isTerminalVisible()) {
                this.do_hide();
            } else {
                this.do_show();
            }
        },

        /* PRIVATE METHODS*/
        _getContext: function() {
            return _.extend({}, session.user_context, this._user_context);
        },
        _storeUserInput: function(strInput) {
            this.$input.append(
                this._templates.render("HISTORY_CMD", {
                    cmd: strInput,
                })
            );
            this._inputHistory.push(strInput);
            this._storage.setItem("terminal_history", this._inputHistory);
            this._searchHistoryIter = this._inputHistory.length;
        },

        _isTerminalVisible: function() {
            return this.$el.css("top") === "0px";
        },

        _encodeHTML: function(text) {
            // See https://en.wikipedia.org/wiki/List_of_Unicode_characters
            return text.replace(
                /[\u00A0-\u9999\u003C-\u003E\u0022-\u002F]/gim,
                i => `&#${i.charCodeAt(0)};`
            );
        },

        _printWelcomeMessage: function() {
            this.print(this._templates.render("WELCOME", {ver: this.VERSION}));
        },

        _cleanShadowInput: function() {
            this.$shadowInput.val("");
        },

        _searchCommandDefByAlias: function(cmd) {
            const cmdKeys = _.keys(this._registeredCmds);
            for (const cmdName of cmdKeys) {
                const cmdDef = this._registeredCmds[cmdName];
                if (cmdDef.aliases.indexOf(cmd) !== -1) {
                    return [cmdName, cmdDef];
                }
            }
            return [false, false];
        },

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
        _searchSimiliarCommand: function(in_cmd) {
            if (in_cmd.length < 3) {
                return false;
            }

            // Only consider words with score lower than this limit
            const SCORE_LIMIT = 50;
            // Columns per Key and Rows per Key
            const cpk = 10,
                rpk = 3;
            const _get_key_dist = function(from, to) {
                // FIXME: Inaccurate keymap
                //      '_' and '-' positions are only valid for spanish layout
                const keymap = [
                    "q",
                    "w",
                    "e",
                    "r",
                    "t",
                    "y",
                    "u",
                    "i",
                    "o",
                    "p",
                    "a",
                    "s",
                    "d",
                    "f",
                    "g",
                    "h",
                    "j",
                    "k",
                    "l",
                    null,
                    "z",
                    "x",
                    "c",
                    "v",
                    "b",
                    "n",
                    "m",
                    "_",
                    "-",
                    null,
                ];
                const _get_key_pos2d = function(key) {
                    const i = keymap.indexOf(key);
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

            const sanitized_in_cmd = in_cmd
                .toLowerCase()
                .replace(/^[^a-z]+|[^a-z]+$/g, "")
                .trim();
            const sortedCmdKeys = _.keys(this._registeredCmds).sort();
            const min_score = [0, ""];
            const l = sortedCmdKeys.length;
            for (let x = 0; x < l; ++x) {
                const cmd = sortedCmdKeys[x];
                // Analize typo's
                const search_index = sanitized_in_cmd.search(cmd);
                let cmd_score = 0;
                if (search_index === -1) {
                    // Penalize word length diff
                    cmd_score =
                        Math.abs(sanitized_in_cmd.length - cmd.length) *
                        cpk *
                        rpk;
                    // Analize letter key distances
                    for (let i = 0; i < sanitized_in_cmd.length; ++i) {
                        if (i < cmd.length) {
                            cmd_score += _get_key_dist(
                                sanitized_in_cmd.charAt(i),
                                cmd.charAt(i)
                            );
                        } else {
                            break;
                        }
                    }
                } else {
                    cmd_score = Math.abs(sanitized_in_cmd.length - cmd.length);
                }

                // Search lower score
                // if zero = perfect match (this never should happens)
                if (min_score[1] === "" || cmd_score < min_score[0]) {
                    min_score[0] = cmd_score;
                    min_score[1] = cmd;
                    if (min_score[0] === 0.0) {
                        break;
                    }
                }
            }

            return min_score[0] < SCORE_LIMIT ? min_score[1] : false;
        },

        _doSearchCommand: function() {
            const matchCmds = _.filter(
                _.keys(this._registeredCmds).sort(),
                item => {
                    return item.indexOf(this._searchCommandQuery) === 0;
                }
            );

            if (!matchCmds.length) {
                this._searchCommandIter = 0;
                return false;
            } else if (this._searchCommandIter >= matchCmds.length) {
                this._searchCommandIter = 0;
            }
            return matchCmds[this._searchCommandIter++];
        },

        _doSearchPrevHistory: function() {
            if (this._searchCommandQuery) {
                const orig_iter = this._searchHistoryIter;
                this._searchHistoryIter = _.findLastIndex(
                    this._inputHistory,
                    (item, i) => {
                        return (
                            item.indexOf(this._searchCommandQuery) === 0 &&
                            i <= this._searchHistoryIter - 1
                        );
                    }
                );
                if (this._searchHistoryIter === -1) {
                    this._searchHistoryIter = orig_iter;
                    return false;
                }
                return this._inputHistory[this._searchHistoryIter];
            }
            --this._searchHistoryIter;
            if (this._searchHistoryIter < 0) {
                this._searchHistoryIter = 0;
            } else if (this._searchHistoryIter >= this._inputHistory.length) {
                this._searchHistoryIter = this._inputHistory.length - 1;
            }
            return this._inputHistory[this._searchHistoryIter];
        },

        _doSearchNextHistory: function() {
            if (this._searchCommandQuery) {
                this._searchHistoryIter = _.findIndex(
                    this._inputHistory,
                    (item, i) => {
                        return (
                            item.indexOf(this._searchCommandQuery) === 0 &&
                            i >= this._searchHistoryIter + 1
                        );
                    }
                );
                if (this._searchHistoryIter === -1) {
                    this._searchHistoryIter = this._inputHistory.length;
                    return false;
                }
                return this._inputHistory[this._searchHistoryIter];
            }
            ++this._searchHistoryIter;
            if (this._searchHistoryIter >= this._inputHistory.length) {
                this._searchCommandQuery = undefined;
                return false;
            } else if (this._searchHistoryIter < 0) {
                this._searchHistoryIter = 0;
            }
            return this._inputHistory[this._searchHistoryIter];
        },

        _processCommandJob: async function(scmd, cmdDef) {
            this.onStartCommand(scmd.cmd, scmd.params);
            let result = "";
            let isFailed = false;
            try {
                result = await cmdDef.callback.bind(this)(...scmd.params);
            } catch (err) {
                isFailed = true;
                result =
                    (err && err.message) ||
                    "[!] Oops! Unknown error! (no detailed error message given :/)";
            } finally {
                this.onFinishCommand(scmd.cmd, scmd.params, isFailed, result);
            }

            return true;
        },

        _updateInput: function(str) {
            this.$input.val(str);
        },
        _updateShadowInput: function(str) {
            this.$shadowInput.val(str);
            this.$shadowInput.scrollLeft(this.$input.scrollLeft());
        },

        _fallbackExecuteCommand: async function() {
            throw new Error("Invalid command definition!");
        },

        _updateRunningCmdCount: function() {
            if (this._runningCommandsCount <= 0) {
                this.$runningCmdCount.fadeOut("fast", function() {
                    $(this).html("");
                });
            } else {
                this.$runningCmdCount
                    .html(`Running ${this._runningCommandsCount} command(s)...`)
                    .show();
            }
        },

        /* HANDLE EVENTS */
        onStartCommand: function() {
            ++this._runningCommandsCount;
            this._updateRunningCmdCount();
        },
        onFinishCommand: function(cmd, params, has_errors, result) {
            --this._runningCommandsCount;
            this._updateRunningCmdCount();
            if (has_errors) {
                this.printError(`Error executing '${cmd}':`);
                this.printError(result, true);
            }
        },

        _preventLostInputFocus: function(ev) {
            const isCKey = ev && (ev.ctrlKey || ev.altKey);
            if (!isCKey) {
                this.$input.focus();
            }
        },

        _onClickTerminalCommand: function(ev) {
            if (
                Object.prototype.hasOwnProperty.call(ev.target.dataset, "cmd")
            ) {
                this.executeCommand(ev.target.dataset.cmd);
            }
        },

        _onClickToggleMaximize: function(ev) {
            const $target = $(ev.currentTarget);
            const isMaximized = this._storage.getItem("screen_maximized");
            if (isMaximized) {
                this.$term.css("height", this.SCREEN_HEIGHT);
                $target.css("backgroundColor", "");
            } else {
                this.$term.css("height", this.SCREEN_MAX_HEIGHT);
                $target.css("backgroundColor", this.BTN_BCKG_COLOR_ACTIVE);
            }
            this._storage.setItem("screen_maximized", !isMaximized);
            this.$term[0].scrollTop = this.$term[0].scrollHeight;
        },

        _onKeyEnter: function() {
            this.executeCommand(this.$input.val());
            this._searchCommandQuery = undefined;
            this._preventLostInputFocus();
        },
        _onKeyArrowUp: function() {
            if (_.isUndefined(this._searchCommandQuery)) {
                this._searchCommandQuery = this.$input.val();
            }
            const found_hist = this._doSearchPrevHistory();
            if (found_hist) {
                this._updateInput(found_hist);
            }
        },
        _onKeyArrowDown: function() {
            if (_.isUndefined(this._searchCommandQuery)) {
                this._searchCommandQuery = this.$input.val();
            }
            const found_hist = this._doSearchNextHistory();
            if (found_hist) {
                this._updateInput(found_hist);
            } else {
                this._searchCommandQuery = undefined;
                this.cleanInput();
            }
        },
        _onKeyArrowRight: function() {
            if (this.$input.val()) {
                this._searchCommandQuery = this.$input.val();
                this._searchHistoryIter = this._inputHistory.length;
                this._onKeyArrowUp();
                this._searchCommandQuery = this.$input.val();
                this._searchHistoryIter = this._inputHistory.length;
            }
        },
        _onKeyTab: function() {
            if (this.$input.val()) {
                if (_.isUndefined(this._searchCommandQuery)) {
                    this._searchCommandQuery = this.$input.val();
                }
                const found_cmd = this._doSearchCommand();
                if (found_cmd) {
                    this._updateInput(found_cmd + " ");
                }
            }
        },

        _onInputKeyDown: function(ev) {
            if (ev.keyCode === 9) {
                // Press Tab
                ev.preventDefault();
            }
        },
        _onInputKeyUp: function(ev) {
            this._cleanShadowInput();
            if (ev.keyCode === $.ui.keyCode.ENTER) {
                this._onKeyEnter();
            } else if (ev.keyCode === $.ui.keyCode.UP) {
                this._onKeyArrowUp();
            } else if (ev.keyCode === $.ui.keyCode.DOWN) {
                this._onKeyArrowDown();
            } else if (ev.keyCode === $.ui.keyCode.RIGHT) {
                this._onKeyArrowRight();
            } else if (ev.keyCode === $.ui.keyCode.TAB) {
                this._onKeyTab();
            } else {
                // Fish-like feature
                if (this.$input.val()) {
                    this._searchCommandQuery = this.$input.val();
                    this._searchHistoryIter = this._inputHistory.length;
                    new Promise(resolve => {
                        resolve(this._doSearchPrevHistory());
                    }).then(found_hist => {
                        this._updateShadowInput(found_hist || "");
                    });
                }

                this._searchHistoryIter = this._inputHistory.length;
                this._searchCommandIter = Object.keys(
                    this._registeredCmds
                ).length;
                this._searchCommandQuery = undefined;
            }
        },

        _onCoreClick: function(ev) {
            // Auto-Hide
            if (this.$el && !this.$el[0].contains(ev.target)) {
                this.do_hide();
            }
        },
        _onCoreKeyDown: function(ev) {
            if (ev.ctrlKey && ev.key === "1") {
                // Press Ctrl + 1
                ev.preventDefault();
                this.do_toggle();
            }
        },

        // NOTE: This method is only used for extension purposes
        _onWindowMessage: function(ev) {
            // We only accept messages from ourselves
            if (event.source !== window) {
                return;
            }
            if (
                !this._has_exec_init_cmds &&
                ev.data.type === "ODOO_TERM_EXEC_INIT_CMDS"
            ) {
                const cmds = _.filter(ev.data.cmds, function(item) {
                    return item && item[0] !== "/" && item[1] !== "/";
                });
                const cmdsLen = cmds.length;
                for (
                    let x = 0;
                    x < cmdsLen;
                    this.executeCommand(cmds[x++], false)
                );
                this._has_exec_init_cmds = true;
            }
        },
        // NOTE-END
    });

    return {
        terminal: Terminal,
        parameterReader: ParameterReader,
        storage: TerminalStorage,
        longpolling: TerminalLongPolling,
    };
});
