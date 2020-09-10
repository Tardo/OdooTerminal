// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.Terminal", function(require) {
    "use strict";

    const core = require("web.core");
    const session = require("web.session");
    const Class = require("web.Class");
    const AbstractTerminal = require("terminal.AbstractTerminal");

    const QWeb = core.qweb;

    const TerminalStorageSession = AbstractTerminal.storage.extend({
        getItem: function(item) {
            return JSON.parse(sessionStorage.getItem(item)) || undefined;
        },

        setItem: function(item, value) {
            try {
                return sessionStorage.setItem(item, JSON.stringify(value));
            } catch (err) {
                if (!this._checkError(err)) {
                    throw err;
                }
            }

            return false;
        },

        removeItem: function(item) {
            return sessionStorage.removeItem(item) || undefined;
        },
    });

    const TerminalStorageLocal = AbstractTerminal.storage.extend({
        getItem: function(item) {
            return JSON.parse(localStorage.getItem(item)) || undefined;
        },

        setItem: function(item, value) {
            try {
                return localStorage.setItem(item, JSON.stringify(value));
            } catch (err) {
                if (!this._checkError(err)) {
                    throw err;
                }
            }

            return false;
        },

        removeItem: function(item) {
            return localStorage.removeItem(item) || undefined;
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
            this._regexArgs = new RegExp(/[l?*]/);
        },

        /**
         * Split and trim values
         * @param {String} text
         * @param {String} separator
         * @returns {Array}
         */
        splitAndTrim: function(text, separator) {
            return _.map(text.split(separator), item => item.trim());
        },

        /**
         * Sanitize command parameters to use when invoke commands.
         * @param {String} cmd_raw
         * @param {Object} cmd_def
         * @returns {Object}
         */
        parse: function(cmd_raw, cmd_def) {
            const match = this._regexParams[Symbol.matchAll](cmd_raw);
            let scmd = Array.from(match, x => x[0]);
            const cmd = scmd[0];
            scmd = scmd.slice(1);
            const rawParams = scmd.join(" ");
            let params = _.map(scmd, item => {
                let nvalue = item;
                if (item[0] === '"' || item[0] === "'") {
                    nvalue = item.substr(1, item.length - 2);
                }
                return cmd_def.sanitized
                    ? this._sanitizeString(nvalue)
                    : nvalue;
            });

            params = this.validateAndFormat(cmd_def.args, params);

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
            if (!args.length) {
                return params;
            }
            const formatted_params = [];
            let checkedCount = 0;
            for (
                let i = 0;
                i < args.length && checkedCount < params.length;
                ++i
            ) {
                let list_mode = false;
                let carg = args[i];
                // Determine argument type (modifiers)
                if (carg === "?") {
                    carg = args[++i];
                } else if (carg === "l") {
                    carg = args[++i];
                    list_mode = true;
                } else if (carg === "*") {
                    for (; checkedCount < params.length; ++checkedCount) {
                        formatted_params.push(
                            this._formatters.s(params[checkedCount])
                        );
                    }
                    break;
                }
                // Parameter validation & formatting
                const param = params[checkedCount];
                if (!this._validators[carg](param, list_mode)) {
                    break;
                }
                formatted_params.push(this._formatters[carg](param, list_mode));
                ++checkedCount;
            }

            if (
                checkedCount !== params.length ||
                checkedCount < this._getNumRequiredArgs(args)
            ) {
                throw new Error("Invalid command parameters");
            }

            return formatted_params;
        },

        /**
         * Convert array of command params to 'raw' string params
         * @param {Array} params
         * @returns {String}
         */
        stringify: function(params) {
            return _.map(params, function(item) {
                if (item.indexOf(" ") === -1) {
                    return item;
                }
                return `"${item}"`;
            }).join(" ");
        },

        /**
         * Get the number of required arguments
         * @param {String} args
         * @returns {Int}
         */
        _getNumRequiredArgs: function(args) {
            const match = args.match(this._regexArgs);
            return match ? match.index : args.length;
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
         * @param {Boolean} list_mode
         * @returns {Boolean}
         */
        _validateString: function(param, list_mode = false) {
            if (list_mode) {
                const param_split = param.split(",");
                let is_valid = true;
                for (const ps of param_split) {
                    const param_sa = ps.trim();
                    if (Number(param_sa) === parseInt(param_sa, 10)) {
                        is_valid = false;
                        break;
                    }
                }
                return is_valid;
            }
            return Number(param) !== parseInt(param, 10);
        },

        /**
         * Test if is an integer.
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Boolean}
         */
        _validateInt: function(param, list_mode = false) {
            if (list_mode) {
                const param_split = param.split(",");
                let is_valid = true;
                for (const ps of param_split) {
                    const param_sa = ps.trim();
                    if (Number(param_sa) !== parseInt(param_sa, 10)) {
                        is_valid = false;
                        break;
                    }
                }
                return is_valid;
            }
            return Number(param) === parseInt(param, 10);
        },

        /**
         * Format value to string
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {String}
         */
        _formatString: function(param, list_mode = false) {
            if (list_mode) {
                return _.map(param.split(","), item => item.trim());
            }
            return param;
        },

        /**
         * Format value to integer
         * @param {String} param
         * @param {Boolean} list_mode
         * @returns {Number}
         */
        _formatInt: function(param, list_mode = false) {
            if (list_mode) {
                return _.map(param.split(","), item => Number(item.trim()));
            }
            return Number(param);
        },
    });

    const Terminal = AbstractTerminal.terminal.extend({
        custom_events: {},
        events: {
            "keyup #terminal_input": "_onInputKeyUp",
            "keydown #terminal_input": "_onInputKeyDown",
            "keydown #terminal_screen": "_preventLostInputFocus",
            "input #terminal_input": "_onInput",
            "click .o_terminal_cmd": "_onClickTerminalCommand",
            "click .terminal-screen-icon-maximize": "_onClickToggleMaximize",
        },

        _runningCommandsCount: 0,
        _errorCount: 0,

        /**
         * This is necessary to prevent terminal issues in Odoo EE
         */
        _initGuard: function() {
            if (typeof this._observer === "undefined") {
                this._observer = new MutationObserver(
                    this._injectTerminal.bind(this)
                );
                this._observer.observe(document.body, {childList: true});
            }
        },

        _injectTerminal: function() {
            const $terms = $("body").find(".o_terminal");
            if ($terms.length > 1) {
                // Remove extra terminals
                $terms.filter(":not(:first-child)").remove();
            } else if (!$terms.length) {
                $(QWeb.render("terminal")).prependTo("body");
                this.setElement($("body").find("#terminal"));
                this.start();
            }
        },

        init: function() {
            this._super.apply(this, arguments);

            this._storage = new TerminalStorageSession(this);
            this._storageLocal = new TerminalStorageLocal(this);
            try {
                this._longpolling = new TerminalLongPolling(this);
            } catch (err) {
                // This happens if 'bus' module is not installed
                this._longpolling = false;
            }
            this._parameterReader = new ParameterReader();
            this._rawTerminal = QWeb.render("terminal");
            this._lazyStorageTerminalScreen = _.debounce(
                function() {
                    this._storage.setItem("terminal_screen", this.$term.html());
                }.bind(this),
                350
            );
            this._runningCommandsCount = 0;
            this._errorCount = 0;

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
                this.$el.addClass("term-maximized");
                this.$(".terminal-screen-icon-maximize")
                    .removeClass("btn-dark")
                    .addClass("btn-light");
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
                    let html_to_print = "";
                    for (let x = 0; x < l; ++x) {
                        html_to_print += `<span class='line-array ${cls ||
                            ""}'>${msg[x]}</span><br>`;
                    }
                    this._printHTML(html_to_print);
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
            } else if (
                typeof error === "object" &&
                "data" in error &&
                "type" in error.data
            ) {
                // It's an Odoo error report
                const error_id = new Date().getTime();
                this.print(
                    this._templates.render("ERROR_MESSAGE", {
                        error_name: this._encodeHTML(error.data.objects[1]),
                        error_message: this._encodeHTML(error.message),
                        error_id: error_id,
                        exception_type: error.data.type,
                        context: "",
                        args: "",
                        debug: this._encodeHTML(error.data.debug),
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
                        error_name: this._encodeHTML(error.statusText),
                        error_message: this._encodeHTML(error.statusText),
                        error_id: error_id,
                        exception_type: "Invalid HTTP Request",
                        context: "",
                        args: "",
                        debug: this._encodeHTML(error.responseText),
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
            this._cleanShadowInput();
        },

        cleanInputHistory: function() {
            this._inputHistory = [];
            this._storage.removeItem("terminal_screen");
        },

        getAliasCommand: function(cmd_name) {
            const aliases =
                this._storageLocal.getItem("terminal_aliases") || {};
            return aliases[cmd_name];
        },

        registerCommand: function(cmd, cmd_def) {
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
                    sanitized: true,
                },
                cmd_def
            );
        },

        executeCommand: function(cmd_raw, store = true) {
            const cmd = cmd_raw || "";
            const cmd_split = cmd_raw.split(" ");
            const cmd_name = cmd_split[0];
            if (!cmd_name) {
                return false;
            }

            let cmd_def = this._registeredCmds[cmd_name];
            let scmd = {};

            // Stop execution if the command doesn't exists
            if (!cmd_def) {
                [, cmd_def] = this._searchCommandDefByAlias(cmd_name);
                if (!cmd_def) {
                    return this._alternativeExecuteCommand(cmd_raw, store);
                }
            }

            try {
                scmd = this._parameterReader.parse(cmd, cmd_def);
            } catch (err) {
                this.eprint(
                    this._templates.render("PROMPT_CMD", {
                        prompt: this.PROMPT,
                        cmd: cmd,
                    })
                );
                this.printError(
                    `<span class='o_terminal_click ` +
                        `o_terminal_cmd' data-cmd='help ${cmd_name}'>` +
                        `${err.message}!</span>`
                );
                if (store) {
                    this._storeUserInput(cmd);
                }
                this.cleanInput();
                return false;
            }
            let template = "PROMPT_CMD";
            if (cmd_def.secured) {
                template = "PROMPT_CMD_HIDDEN_ARGS";
            } else if (store) {
                this._storeUserInput(cmd);
            }
            this.eprint(
                this._templates.render(template, {
                    prompt: this.PROMPT,
                    cmd: cmd_raw,
                })
            );
            this.cleanInput();
            this._processCommandJob(scmd, cmd_def);
            return true;
        },

        /* VISIBILIY */
        do_show: function() {
            this.$el.addClass("terminal-transition-topdown");
            this.$input.focus();
        },

        do_hide: function() {
            this.$el.removeClass("terminal-transition-topdown");
        },

        do_toggle: function() {
            if (this._isTerminalVisible()) {
                this.do_hide();
            } else {
                this.do_show();
            }
        },

        /* PRIVATE METHODS*/
        _alternativeExecuteCommand: function(cmd_raw, store = true) {
            const cmd = cmd_raw || "";
            const cmd_split = cmd_raw.split(" ");
            const cmd_name = cmd_split[0];
            // Try alias
            let alias_cmd = this.getAliasCommand(cmd_name);
            if (alias_cmd) {
                const scmd = this._parameterReader.parse(cmd, {args: "*"});
                for (const index in scmd.params) {
                    const re = new RegExp(`\\$${Number(index) + 1}`, "g");
                    alias_cmd = alias_cmd.replace(re, scmd.params[index]);
                }
                if (store) {
                    this._storeUserInput(cmd);
                }
                this.executeCommand(alias_cmd, false);
                return true;
            }

            // Search similar commands
            const similar_cmd = this._searchSimiliarCommand(cmd_name);
            if (similar_cmd) {
                this.print(
                    this._templates.render("UNKNOWN_COMMAND", {
                        cmd: similar_cmd,
                        params: cmd_split.slice(1),
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
        },

        _getContext: function() {
            return _.extend({}, session.user_context, this._userContext);
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
            return parseInt(this.$el.css("top"), 10) >= 0;
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
            const cmd_keys = _.keys(this._registeredCmds);
            for (const cmd_name of cmd_keys) {
                const cmd_def = this._registeredCmds[cmd_name];
                if (cmd_def.aliases.indexOf(cmd) !== -1) {
                    return [cmd_name, cmd_def];
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
            const sorted_cmd_keys = _.keys(this._registeredCmds).sort();
            const min_score = [0, ""];
            const sorted_keys_len = sorted_cmd_keys.length;
            for (let x = 0; x < sorted_keys_len; ++x) {
                const cmd = sorted_cmd_keys[x];
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
            const match_cmds = _.filter(
                _.keys(this._registeredCmds).sort(),
                item => item.indexOf(this._searchCommandQuery) === 0
            );

            if (!match_cmds.length) {
                this._searchCommandIter = 0;
                return false;
            } else if (this._searchCommandIter >= match_cmds.length) {
                this._searchCommandIter = 0;
            }
            return match_cmds[this._searchCommandIter++];
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

        _processCommandJob: function(scmd, cmd_def) {
            return new Promise(async resolve => {
                this.onStartCommand(scmd.cmd, scmd.params);
                let result = "";
                let is_failed = false;
                try {
                    result = await cmd_def.callback.bind(this)(...scmd.params);
                } catch (err) {
                    is_failed = true;
                    result =
                        err ||
                        "[!] Oops! Unknown error! (no detailed error message given :/)";
                } finally {
                    this.onFinishCommand(
                        scmd.cmd,
                        scmd.params,
                        is_failed,
                        result
                    );
                }
                resolve();
            });
        },

        _updateInput: function(str) {
            this.$input.val(str);
            this._cleanShadowInput();
        },
        _updateShadowInput: function(str) {
            this.$shadowInput.val(str);
            this.$shadowInput.scrollLeft(this.$input.scrollLeft());
        },

        _fallbackExecuteCommand: function() {
            return Promise.reject("Invalid command definition!");
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
                if (
                    typeof result === "object" &&
                    !("data" in result) &&
                    "message" in result
                ) {
                    this.printError(result.message, true);
                } else {
                    this.printError(result, true);
                }
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
            const is_maximized = this._storage.getItem("screen_maximized");
            if (is_maximized) {
                this.$el.removeClass("term-maximized");
                $target.removeClass("btn-light").addClass("btn-dark");
            } else {
                this.$el.addClass("term-maximized");
                $target.removeClass("btn-dark").addClass("btn-light");
            }
            this._storage.setItem("screen_maximized", !is_maximized);
            this.$term[0].scrollTop = this.$term[0].scrollHeight;
            this._preventLostInputFocus();
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
        _onKeyArrowRight: function(ev) {
            if (
                this.$input.val() &&
                ev.target.selectionStart === this.$input.val().length
            ) {
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

        _onInput: function() {
            // Fish-like feature
            this._cleanShadowInput();
            if (this.$input.val()) {
                this._searchCommandQuery = this.$input.val();
                this._searchHistoryIter = this._inputHistory.length;
                new Promise(resolve => {
                    resolve(this._doSearchPrevHistory());
                }).then(found_hist => {
                    this._updateShadowInput(found_hist || "");
                });
            }
        },

        _onInputKeyDown: function(ev) {
            if (ev.keyCode === 9) {
                // Press Tab
                ev.preventDefault();
            }
        },
        _onInputKeyUp: function(ev) {
            if (ev.keyCode === $.ui.keyCode.ENTER) {
                this._onKeyEnter(ev);
            } else if (ev.keyCode === $.ui.keyCode.UP) {
                this._onKeyArrowUp(ev);
            } else if (ev.keyCode === $.ui.keyCode.DOWN) {
                this._onKeyArrowDown(ev);
            } else if (ev.keyCode === $.ui.keyCode.RIGHT) {
                this._onKeyArrowRight(ev);
            } else if (ev.keyCode === $.ui.keyCode.TAB) {
                this._onKeyTab(ev);
            } else {
                this._searchHistoryIter = this._inputHistory.length;
                this._searchCommandIter = Object.keys(
                    this._registeredCmds
                ).length;
                this._searchCommandQuery = undefined;
            }
        },

        _onCoreClick: function(ev) {
            // Auto-Hide
            if (
                this.$el &&
                !this.$el[0].contains(ev.target) &&
                this._isTerminalVisible() &&
                !this._storage.getItem("screen_maximized")
            ) {
                this.do_hide();
            }
        },
        _onCoreKeyDown: function(ev) {
            if (ev.keyCode === 27) {
                // Press Escape
                this.do_hide();
            } else if (ev.ctrlKey && ev.key === "1") {
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
                !this._hasExecInitCmds &&
                ev.data.type === "ODOO_TERM_EXEC_INIT_CMDS"
            ) {
                const cmds = _.filter(ev.data.cmds, function(item) {
                    return item && item[0] !== "/" && item[1] !== "/";
                });
                const cmds_len = cmds.length;
                for (
                    let x = 0;
                    x < cmds_len;
                    this.executeCommand(cmds[x++], false)
                );
                this._hasExecInitCmds = true;
            }
        },
        // NOTE-END
    });

    return {
        terminal: Terminal,
        parameterReader: ParameterReader,
        storageSession: TerminalStorageSession,
        storageLocal: TerminalStorageLocal,
        longpolling: TerminalLongPolling,
    };
});
