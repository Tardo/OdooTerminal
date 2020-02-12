// Copyright 2018-2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.Terminal", function(require) {
    "use strict";

    const core = require("web.core");
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

    /**
     * This class is used to parse terminal command parameters.
     */
    const ParameterReader = Class.extend({
        INPUT_GROUP_DELIMETERS: ['"', "'"],

        _regexSanitize: null,

        init: function() {
            this._regexSanitize = new RegExp("'", "g");
        },

        /**
         * Sanitize command parameters to use when invoke commands.
         * @param {String} strParams
         * @returns {Object}
         */
        parse: function(strParams) {
            let scmd = strParams.split(" ");
            const rawParams = scmd.slice(1).join(" ");
            scmd = _.filter(scmd, function(item) {
                return item;
            });

            const c_group = [false, false];
            let mdeli = "";
            const params = [];
            for (const i in scmd) {
                const startChar = scmd[i].charAt(0);
                const endChar = scmd[i].charAt(scmd[i].length - 1);
                if (
                    c_group[0] === false &&
                    this.INPUT_GROUP_DELIMETERS.indexOf(startChar) !== -1
                ) {
                    c_group[0] = i;
                    mdeli = startChar;
                }
                if (c_group[0] !== false && endChar === mdeli) {
                    c_group[1] = i;
                }

                if (c_group[0] !== false && c_group[1] !== false) {
                    scmd[c_group[0]] = scmd[c_group[0]].slice(1);
                    scmd[c_group[1]] = scmd[c_group[1]].slice(
                        0,
                        scmd[c_group[1]].length - 1
                    );
                    params.push(
                        this._sanitizeString(
                            _.clone(scmd)
                                .splice(c_group[0], c_group[1] - c_group[0] + 1)
                                .join(" ")
                        )
                    );
                    c_group[0] = false;
                    c_group[1] = false;
                } else if (c_group[0] === false && c_group[1] === false) {
                    params.push(this._sanitizeString(scmd[i]));
                }
            }

            return {
                cmd: params[0],
                rawParams: rawParams,
                params: params.slice(1),
            };
        },

        /**
         * Replace all quotes to double-quotes.
         * @param {String} str
         * @returns {String}
         */
        _sanitizeString: function(str) {
            return str.replace(this._regexSanitize, '"');
        },
    });

    /**
     * This class is used to validate command parameters
     */
    const ParameterChecker = Class.extend({
        _validators: {},

        init: function() {
            this._validators.s = this._validateString;
            this._validators.i = this._validateInt;
        },

        /**
         * Check if the parameter type correspond with the expected type.
         * @param {Array} args
         * @param {Array} params
         * @returns {Boolean}
         */
        validate: function(args, params) {
            let curParamIndex = 0;
            for (let i = 0; i < args.length; ++i) {
                let carg = args[i];
                let optional = false;
                if (carg === "?") {
                    optional = true;
                    carg = args[++i];
                }

                const isInvalidNO = !optional && curParamIndex >= params.length;
                const isInvalidO =
                    curParamIndex < params.length &&
                    !this._validators[carg](params[curParamIndex]);
                if (isInvalidNO || isInvalidO) {
                    return false;
                }

                ++curParamIndex;
            }

            return !curParamIndex || params.length <= curParamIndex;
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
    });

    const Terminal = AbstractTerminal.terminal.extend({
        events: {
            "keyup #terminal_input": "_onInputKeyUp",
            "keydown #terminal_input": "_onInputKeyDown",
            "keydown #terminal_screen": "_preventLostInputFocus",
            "click .o_terminal_cmd": "_onClickTerminalCommand",
            "click .terminal-screen-icon-maximize": "_onClickToggleMaximize",
        },

        _parameterChecker: null,
        _parameterReader: null,

        _runningCommandsCount: 0,

        init: function() {
            this._super.apply(this, arguments);

            this._storage = new TerminalStorage(this);
            this._parameterChecker = new ParameterChecker();
            this._parameterReader = new ParameterReader();

            this.documentComputedStyle = getComputedStyle(
                document.documentElement
            );

            $(QWeb.render("terminal")).prependTo("body");

            this._lazyStorageTerminalScreen = _.debounce(
                function() {
                    this._storage.setItem("terminal_screen", this.$term.html());
                }.bind(this),
                350
            );

            // Listen messages from 'content script'
            window.addEventListener(
                "message",
                function(ev) {
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
                        for (const cmd of cmds) {
                            this.eprint(
                                _.template("<%= prompt %> <%= cmd %>")({
                                    prompt: this.PROMPT,
                                    cmd: cmd,
                                })
                            );
                            this._processCommandJob(cmd);
                        }

                        this._has_exec_init_cmds = true;
                    }
                }.bind(this)
            );
        },

        start: function() {
            this._super.apply(this, arguments);

            // Custom Events
            this.$el[0].addEventListener("toggle", this.do_toggle.bind(this));

            const isMaximized = this._storage.getItem("screen_maximized");
            if (isMaximized) {
                const max_height = this.documentComputedStyle.getPropertyValue(
                    "--terminal-screen-max-height"
                );
                const btn_bkg_color = this.documentComputedStyle.getPropertyValue(
                    "--terminal-screen-background-button-active"
                );
                this.$("#terminal_screen").css("height", max_height);
                this.$(".terminal-screen-icon-maximize").css(
                    "backgroundColor",
                    btn_bkg_color
                );
            }

            this.$(".terminal-prompt").val(this.PROMPT);

            this.$input = this.$("#terminal_input");
            this.$shadowInput = this.$("#terminal_shadow_input");
            this.$term = this.$("#terminal_screen");
            this.$runningCmdCount = this.$("#terminal_running_cmd_count");

            core.bus.on("keydown", this, this._onCoreKeyDown);
            core.bus.on("click", this, this._onCoreClick);

            const cachedScreen = this._storage.getItem("terminal_screen");
            if (_.isUndefined(cachedScreen)) {
                this._printWelcomeMessage();
                this.print("");
            } else {
                this._printHTML(cachedScreen);
                // FIXME: For some reason need ensure scroll position
                _.defer(
                    function() {
                        this.$term[0].scrollTop = this.$term[0].scrollHeight;
                    }.bind(this)
                );
            }
            const cachedHistory = this._storage.getItem("terminal_history");
            if (!_.isUndefined(cachedHistory)) {
                this._inputHistory = cachedHistory;
                this._searchHistoryIter = this._inputHistory.length;
            }
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
                        $(msg).wrap(`<span class='${cls || ""}'></span>`)
                    );
                } else {
                    this._printHTML(
                        `<span class='${cls || ""}'>` +
                            `${this._prettyObjectString(msg)}</span>`
                    );
                }
            } else {
                this._printHTML(`<span class='${cls || ""}'>${msg}</span>`);
            }
            if (!enl) {
                this._printHTML("<br>");
            }
        },

        eprint: function(msg, enl) {
            this.print(document.createTextNode(msg), enl);
        },

        printTable: function(columns, tbody) {
            this.print(
                _.template(`<table class="print-table">
                <thead>
                    <tr>
                        <th><%= thead %></th>
                    </tr>
                </thead>
                <tbody>
                    <%= tbody %>
                </tbody>
            </table>`)({
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
                },
                cmdDef
            );
        },

        executeCommand: function(cmd, store = true) {
            if (cmd) {
                const scmd = this._parameterReader.parse(cmd);
                const cmdDef = this._registeredCmds[scmd.cmd];
                if (cmdDef && cmdDef.secured) {
                    this.eprint(
                        _.template("<%= prompt %> <%= cmd %> *****")({
                            prompt: this.PROMPT,
                            cmd: scmd.cmd,
                        })
                    );
                } else {
                    this.eprint(
                        _.template("<%= prompt %> <%= cmd %>")({
                            prompt: this.PROMPT,
                            cmd: cmd,
                        })
                    );

                    if (store) {
                        this.$input.append(
                            _.template("<option><%= cmd %></option>")({
                                cmd: cmd,
                            })
                        );
                        this._inputHistory.push(cmd);
                        this._storage.setItem(
                            "terminal_history",
                            this._inputHistory
                        );
                    }
                }
                this.cleanInput();
                this._processCommandJob(scmd);
            }
        },

        /* VISIBILIY */
        do_show: function() {
            this.$el.animate({top: "0"});
            this.$input.focus();
        },

        do_hide: function() {
            this.$el.animate({top: "-100%"});
        },

        do_toggle: function() {
            if (this.$el.css("top") === "0px") {
                this.do_hide();
            } else {
                this.do_show();
            }
        },

        /* GENERAL */
        setActiveWidget: function(widget) {
            this._active_widget = widget;
        },

        setActiveAction: function(action) {
            this._active_action = action;
        },

        /* PRIVATE METHODS*/
        _printWelcomeMessage: function() {
            this.print(
                _.template(
                    "<strong class='o_terminal_title'>Odoo " +
                        "Terminal v<%= ver %></strong>"
                )({ver: this.VERSION})
            );
        },

        _cleanShadowInput: function() {
            this.$shadowInput.val("");
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
            for (const cmd of sortedCmdKeys) {
                // Penalize word length diff
                let cmd_score =
                    Math.abs(sanitized_in_cmd.length - cmd.length) * cpk * rpk;
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
            const self = this;
            const matchCmds = _.filter(
                _.keys(this._registeredCmds).sort(),
                function(item) {
                    return item.indexOf(self._searchCommandQuery) === 0;
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
            const self = this;
            if (this._searchCommandQuery) {
                const orig_iter = self._searchHistoryIter;
                this._searchHistoryIter = _.findLastIndex(
                    this._inputHistory,
                    function(item, i) {
                        return (
                            item.indexOf(self._searchCommandQuery) === 0 &&
                            i <= self._searchHistoryIter - 1
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
            const self = this;
            if (this._searchCommandQuery) {
                this._searchHistoryIter = _.findIndex(
                    this._inputHistory,
                    function(item, i) {
                        return (
                            item.indexOf(self._searchCommandQuery) === 0 &&
                            i >= self._searchHistoryIter + 1
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

        _processCommandJob: function(scmd) {
            const self = this;
            if (
                Object.prototype.hasOwnProperty.call(
                    this._registeredCmds,
                    scmd.cmd
                )
            ) {
                const cmdDef = this._registeredCmds[scmd.cmd];
                if (this._parameterChecker.validate(cmdDef.args, scmd.params)) {
                    this.onStartCommand(scmd.cmd, scmd.params);
                    try {
                        return cmdDef.callback
                            .bind(this)(scmd.params)
                            .then(
                                result => {
                                    self.onFinishCommand(
                                        scmd.cmd,
                                        scmd.params,
                                        false,
                                        result
                                    );
                                },
                                emsg => {
                                    self.onFinishCommand(
                                        scmd.cmd,
                                        scmd.params,
                                        true,
                                        emsg
                                    );
                                }
                            );
                    } catch (err) {
                        self.onFinishCommand(
                            scmd.cmd,
                            scmd.params,
                            true,
                            err.message
                        );
                    }
                    return false;
                }
                this.print(
                    `<span class='o_terminal_click ` +
                        `o_terminal_cmd' data-cmd='help ${scmd.cmd}'>[!] ` +
                        `Invalid command parameters!</span>`
                );
            } else {
                const similar_cmd = this._searchSimiliarCommand(scmd.cmd);
                if (similar_cmd) {
                    this.print(
                        _.template(
                            "Unknown command. Did you mean " +
                                "'<strong class='o_terminal_click " +
                                "o_terminal_cmd' data-cmd='<%= cmd %> <%= params %>'>" +
                                "<%= cmd %></strong>'?"
                        )({
                            cmd: similar_cmd,
                            params: scmd.rawParams,
                        })
                    );
                } else {
                    this.eprint("Unknown command.");
                }
            }

            return false;
        },

        _updateInput: function(str) {
            this.$input.val(str);
        },
        _updateShadowInput: function(str) {
            this.$shadowInput.val(str);
        },

        _fallbackExecuteCommand: function() {
            const defer = $.Deferred(d => {
                d.reject("Invalid command definition!");
            });
            return $.when(defer);
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
                var errorMessage = this._getCommandErrorMessage(result);
                this.eprint(`[!] Error executing '${cmd}':`);
                this.print(errorMessage, false, "error_message");
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
                const cmd = ev.target.dataset.cmd;
                this.eprint(
                    _.template("<%= prompt %> <%= cmd %>")({
                        prompt: this.PROMPT,
                        cmd: cmd,
                    })
                );
                this._processCommandJob(cmd);
            }
        },

        _onClickToggleMaximize: function(ev) {
            const $target = $(ev.currentTarget);
            const isMaximized = this.$term.data("maximized");
            if (isMaximized) {
                const norm_height = this.documentComputedStyle.getPropertyValue(
                    "--terminal-screen-height"
                );
                this.$term.css("height", norm_height);
                $target.css("backgroundColor", "");
            } else {
                const max_height = this.documentComputedStyle.getPropertyValue(
                    "--terminal-screen-max-height"
                );
                const btn_bkg_color = this.documentComputedStyle.getPropertyValue(
                    "--terminal-screen-background-button-active"
                );
                this.$term.css("height", max_height);
                $target.css("backgroundColor", btn_bkg_color);
            }
            this.$term.data("maximized", !isMaximized);
            this.$term[0].scrollTop = this.$term[0].scrollHeight;
        },

        _onKeyEnter: function() {
            this.executeCommand(this.$input.val());
            this._searchHistoryIter = this._inputHistory.length;
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
            if (ev.keyCode === 13) {
                this._onKeyEnter();
            } else if (ev.keyCode === 38) {
                this._onKeyArrowUp();
            } else if (ev.keyCode === 40) {
                this._onKeyArrowDown();
            } else if (ev.keyCode === 39) {
                this._onKeyArrowRight();
            } else if (ev.keyCode === 9) {
                this._onKeyTab();
            } else {
                // Fish-like feature
                if (this.$input.val()) {
                    this._searchCommandQuery = this.$input.val();
                    this._searchHistoryIter = this._inputHistory.length;
                    const self = this;
                    $.Deferred(d => {
                        const found_hist = self._doSearchPrevHistory();
                        self._updateShadowInput(found_hist || "");
                        d.resolve();
                    });
                }

                this._searchHistoryIter = this._inputHistory.length;
                this._searchCommandIter = this._inputHistory.length;
                this._searchCommandQuery = undefined;
            }
        },

        _onCoreClick: function(ev) {
            // Auto-Hide
            if (!this.$el[0].contains(ev.target)) {
                this.do_hide();
            }
        },
        _onCoreKeyDown: function(ev) {
            if (ev.ctrlKey && ev.keyCode === 49) {
                // Press Ctrl + 1
                ev.preventDefault();
                this.do_toggle();
            }
        },
    });

    return {
        terminal: Terminal,
        parameterReader: ParameterReader,
        parameterChecker: ParameterChecker,
        storage: TerminalStorage,
    };
});
