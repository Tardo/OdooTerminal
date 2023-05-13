// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.Terminal", function (require) {
    "use strict";

    const core = require("web.core");
    const session = require("web.session");
    const Widget = require("web.Widget");
    const Screen = require("terminal.core.Screen");
    const Longpolling = require("terminal.core.Longpolling");
    const VMachine = require("terminal.core.trash.vmachine");
    const TrashConst = require("terminal.core.trash.const");
    const TrashException = require("terminal.core.trash.exception");
    const TemplateManager = require("terminal.core.TemplateManager");
    const Storage = require("terminal.core.Storage");
    const CommandAssistant = require("terminal.core.CommandAssistant");

    const QWeb = core.qweb;
    const _t = core._t;
    const _lt = core._lt;

    const Terminal = Widget.extend({
        VERSION: "9.3.2",

        MODES: {
            BACKEND_NEW: 1,
            BACKEND_OLD: 2,
            FRONTEND: 3,
        },

        events: {
            "click .o_terminal_cmd": "_onClickTerminalCommand",
            "click .terminal-screen-icon-maximize": "_onClickToggleMaximize",
            "click .terminal-screen-icon-pin": "_onClickToggleScreenPin",
        },

        _commandTimeout: 30000,

        _registeredCmds: {},
        _inputHistory: [],
        _searchCommandIter: 0,
        _searchCommandQuery: "",
        _searchHistoryIter: 0,

        _storage: null,
        _longpolling: null,

        _hasExecInitCmds: false,
        _userContext: {},

        /**
         * This is necessary to prevent terminal issues in Odoo EE
         */
        _initGuard: function () {
            if (typeof this._observer === "undefined") {
                this._observer = new MutationObserver(
                    this._injectTerminal.bind(this)
                );
                this._observer.observe(document.body, {childList: true});
            }
        },

        _injectTerminal: function () {
            const $terms = $("body").find(".o_terminal");
            if ($terms.length > 1) {
                // Remove extra terminals
                $terms.filter(":not(:first-child)").remove();
            } else if (!$terms.length) {
                $(this._rawTerminalTemplate).prependTo("body");
                this.setElement($("body").find("#terminal"));
            }
        },

        init: function (parent, mode, options) {
            this._super.apply(this, arguments);
            this._mode = mode;
            this.env = options?.env;
            this._buffer = {};
            this._jobs = [];
            this._storage = new Storage.StorageSession();
            this._storageLocal = new Storage.StorageLocal();
            try {
                this._longpolling = new Longpolling(this);
            } catch (err) {
                // This happens if 'bus' module is not installed
                console.warn(
                    "[OdooTerminal] Can't initilize longpolling: ",
                    err
                );
                this._longpolling = false;
            }
            this.screen = new Screen({
                onSaveScreen: function (content) {
                    _.debounce(
                        this._storage.setItem(
                            "terminal_screen",
                            content,
                            (err) => this.screen.printHTML(err)
                        ),
                        350
                    );
                }.bind(this),
                onCleanScreen: () =>
                    this._storage.removeItem("terminal_screen"),
                onInputKeyUp: this._onInputKeyUp.bind(this),
                onInput: this._onInput.bind(this),
            });

            core.bus.on("keydown", this, this._onCoreKeyDown);
            core.bus.on("click", this, this._onCoreClick);
            window.addEventListener(
                "beforeunload",
                this._onCoreBeforeUnload.bind(this),
                true
            );
            // NOTE: Listen messages from 'content script'
            window.addEventListener(
                "message",
                this._onWindowMessage.bind(this),
                true
            );
            // NOTE-END

            this._wasStart = false;

            // Cached content
            const cachedScreen = this._storage.getItem("terminal_screen");
            if (_.isUndefined(cachedScreen)) {
                this._printWelcomeMessage();
                this.screen.print("");
            } else {
                this.screen.printHTML(cachedScreen);
                // RequestAnimationFrame(() => this.screen.scrollDown());
            }
            const cachedHistory = this._storage.getItem("terminal_history");
            if (!_.isUndefined(cachedHistory)) {
                this._inputHistory = cachedHistory;
                this._searchHistoryIter = this._inputHistory.length;
            }

            this._createTerminal();
        },

        start: function () {
            if (!this._wasLoaded) {
                return Promise.reject();
            }

            return new Promise(async (resolve, reject) => {
                this.$runningCmdCount = this.$("#terminal_running_cmd_count");
                try {
                    this._virtMachine = new VMachine(
                        this._registeredCmds,
                        this._storageLocal,
                        {
                            processCommandJob:
                                this._processCommandJob.bind(this),
                        }
                    );
                    this._commandAssistant = new CommandAssistant(this);
                    await this._super.apply(this, arguments);
                    await this.screen.start(this.$el);
                    this.screen.applyStyle("opacity", this._config.opacity);
                    if (!this._hasExecInitCmds) {
                        if (this._config.init_cmds) {
                            await this.execute(
                                this._config.init_cmds,
                                false,
                                true
                            );
                        }
                        this._hasExecInitCmds = true;
                    }
                } catch (err) {
                    return reject(err);
                }
                return resolve();
            });
        },

        destroy: function () {
            if (typeof this._observer !== "undefined") {
                this._observer.disconnect();
            }
            window.removeEventListener("message", this._onWindowMessage, true);
            window.removeEventListener(
                "beforeunload",
                this._onCoreBeforeUnload,
                true
            );
            core.bus.off("keydown", this, this._onCoreKeyDown);
            core.bus.off("click", this, this._onCoreClick);
            this.$el[0].removeEventListener("toggle", this.doToggle.bind(this));
            this._super.apply(this, arguments);
        },

        /* BASIC FUNCTIONS */
        cleanInputHistory: function () {
            this._inputHistory = [];
            this._storage.removeItem("terminal_screen");
        },

        registerCommand: function (cmd, cmd_def) {
            this._registeredCmds[cmd] = _.extend(
                {
                    definition: "Undefined command",
                    callback: this._fallbackExecuteCommand,
                    detail: _lt(
                        "This command hasn't a properly detailed information"
                    ),
                    args: null,
                    secured: false,
                    aliases: [],
                    example: "",
                },
                cmd_def
            );
        },

        validateCommand: function (cmd) {
            if (!cmd) {
                return [false, false];
            }
            const cmd_split = cmd.split(" ");
            const cmd_name = cmd_split[0];
            if (!cmd_name) {
                return [cmd, false];
            }
            return [cmd, cmd_name];
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
        searchSimiliarCommand: function (in_cmd) {
            if (in_cmd.length < 3) {
                return false;
            }

            // Only consider words with score lower than this limit
            const SCORE_LIMIT = 50;
            // Columns per Key and Rows per Key
            const cpk = 10,
                rpk = 3;
            const max_dist = Math.sqrt(cpk + rpk);
            const _get_key_dist = function (from, to) {
                const _get_key_pos2d = function (key) {
                    const i = TrashConst.KEYMAP.indexOf(key);
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

            const sanitized_in_cmd = in_cmd.toLowerCase();
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
                        Math.abs(sanitized_in_cmd.length - cmd.length) / 2 +
                        max_dist;
                    // Analize letter key distances
                    for (let i = 0; i < sanitized_in_cmd.length; ++i) {
                        if (i < cmd.length) {
                            const score = _get_key_dist(
                                sanitized_in_cmd.charAt(i),
                                cmd.charAt(i)
                            );
                            if (score === 0) {
                                --cmd_score;
                            } else {
                                cmd_score += score;
                            }
                        } else {
                            break;
                        }
                    }
                    // Using all letters?
                    const cmd_vec = _.map(cmd, (k) => k.charCodeAt(0));
                    const in_cmd_vec = _.map(sanitized_in_cmd, (k) =>
                        k.charCodeAt(0)
                    );
                    if (_.difference(in_cmd_vec, cmd_vec).length === 0) {
                        cmd_score -= max_dist;
                    }
                } else {
                    cmd_score =
                        Math.abs(sanitized_in_cmd.length - cmd.length) / 2;
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

        execute: function (cmd_raw, store = true, silent = false) {
            return new Promise(async (resolve, reject) => {
                await this._wakeUp();

                // Check if secured commands involved
                if (!silent) {
                    this.screen.printCommand(cmd_raw);
                }
                this.screen.cleanInput();
                if (store) {
                    this._storeUserInput(cmd_raw);
                }
                const cmd_res = [];
                try {
                    const results = await this._virtMachine.eval(cmd_raw, {
                        silent: silent,
                    });
                    for (const result of results) {
                        cmd_res.push(result);
                    }
                } catch (err) {
                    let err_msg = err.message;
                    if (
                        err.constructor === TrashException.UnknownCommandError
                    ) {
                        // Search similar commands
                        const similar_cmd = this.searchSimiliarCommand(
                            err.cmd_name
                        );
                        if (similar_cmd) {
                            err_msg = TemplateManager.render(
                                "UNKNOWN_COMMAND",
                                {
                                    org_cmd: err.cmd_name,
                                    cmd: similar_cmd,
                                    pos: [err.start, err.end],
                                }
                            );
                        }
                    }
                    this.screen.printError(err_msg);
                    return reject(err);
                }

                if (cmd_res.length === 1) {
                    return resolve(cmd_res[0]);
                }
                return resolve(cmd_res);
            });
        },

        _wakeUp: function () {
            return new Promise((resolve, reject) => {
                if (this._wasLoaded) {
                    if (this._wasStart) {
                        resolve();
                    } else {
                        this._wasStart = true;
                        return this.start()
                            .then(() => {
                                this.screen.flush();
                                resolve();
                            })
                            .catch((err) => reject(err));
                    }
                } else {
                    reject();
                }
            });
        },

        /* VISIBILIY */
        doShow: function () {
            if (!this._wasLoaded) {
                return Promise.resolve();
            }
            // Only start the terminal if needed
            return this._wakeUp().then(() => {
                this.$el.addClass("terminal-transition-topdown");
                this.screen.focus();
            });
        },

        doHide: function () {
            this.$el.removeClass("terminal-transition-topdown");
            return Promise.resolve();
        },

        doToggle: function () {
            if (this._isTerminalVisible()) {
                return this.doHide();
            }

            return this.doShow();
        },

        /* PRIVATE METHODS*/
        _createTerminal: function () {
            QWeb.add_template(
                "<templates>" +
                    "<t t-name='terminal'>" +
                    "<div id='terminal' class='o_terminal'>" +
                    "<div class='terminal-screen-info-zone'>" +
                    "<span class='terminal-screen-running-cmds' id='terminal_running_cmd_count' />" +
                    `<div class='btn btn-sm btn-dark terminal-screen-icon-maximize p-2' role='button' title="${_lt(
                        "Maximize"
                    )}">` +
                    "<i class='fa fa-window-maximize'></i>" +
                    "</div>" +
                    `<div class='btn btn-sm btn-dark terminal-screen-icon-pin p-2' role='button' title="${_lt(
                        "Pin"
                    )}">` +
                    "<i class='fa fa-map-pin'></i>" +
                    "</div>" +
                    "</div>" +
                    "</div>" +
                    "</t>" +
                    "</templates>"
            );
            this._rawTerminalTemplate = QWeb.render("terminal");

            this._injectTerminal();
            this._initGuard();

            // Custom Events
            this.$el[0].addEventListener("toggle", this.doToggle.bind(this));
        },

        _getContext: function (extra_context) {
            return _.extend(
                {},
                session.user_context,
                this._userContext,
                extra_context
            );
        },

        _storeUserInput: function (strInput) {
            this._inputHistory.push(strInput);
            this._storage.setItem(
                "terminal_history",
                this._inputHistory,
                (err) => this.screen.printError(err, true)
            );
            this._searchHistoryIter = this._inputHistory.length;
        },

        _isTerminalVisible: function () {
            return this.$el && parseInt(this.$el.css("top"), 10) >= 0;
        },

        _printWelcomeMessage: function () {
            this.screen.print(
                TemplateManager.render("WELCOME", {ver: this.VERSION})
            );
        },

        _doSearchCommand: function () {
            const match_cmds = _.filter(
                _.keys(this._registeredCmds).sort(),
                (item) => item.indexOf(this._searchCommandQuery) === 0
            );

            if (!match_cmds.length) {
                this._searchCommandIter = 0;
                return false;
            } else if (this._searchCommandIter >= match_cmds.length) {
                this._searchCommandIter = 0;
            }
            return match_cmds[this._searchCommandIter++];
        },

        _doSearchPrevHistory: function () {
            const orig_iter = this._searchHistoryIter;
            const last_str = this._inputHistory[this._searchHistoryIter];
            this._searchHistoryIter = _.findLastIndex(
                this._inputHistory,
                (item, i) => {
                    if (this._searchCommandQuery) {
                        return (
                            item !== last_str &&
                            item.indexOf(this._searchCommandQuery) === 0 &&
                            i < this._searchHistoryIter
                        );
                    }
                    return item !== last_str && i < this._searchHistoryIter;
                }
            );
            if (this._searchHistoryIter === -1) {
                this._searchHistoryIter = orig_iter;
                return false;
            }
            return this._inputHistory[this._searchHistoryIter];
        },

        _doSearchNextHistory: function () {
            const last_str = this._inputHistory[this._searchHistoryIter];
            this._searchHistoryIter = _.findIndex(
                this._inputHistory,
                (item, i) => {
                    if (this._searchCommandQuery) {
                        return (
                            item !== last_str &&
                            item.indexOf(this._searchCommandQuery) === 0 &&
                            i > this._searchHistoryIter
                        );
                    }
                    return item !== last_str && i > this._searchHistoryIter;
                }
            );
            if (this._searchHistoryIter === -1) {
                this._searchHistoryIter = this._inputHistory.length;
                return false;
            }
            return this._inputHistory[this._searchHistoryIter];
        },

        _fallbackExecuteCommand: function () {
            return Promise.reject(_t("Invalid command definition!"));
        },

        _updateJobsInfo: function () {
            if (!this._wasStart) {
                return;
            }
            const count = this._jobs.filter(Object).length;
            if (count) {
                const count_unhealthy = this._jobs.filter(
                    (item) => !item.healthy
                ).length;
                let str_info = `${_t("Running")} ${count} ${_t("command(s)")}`;
                if (count_unhealthy) {
                    str_info += ` (${count_unhealthy} ${_t("unhealthy")})`;
                }
                str_info += "...";
                this.$runningCmdCount.html(str_info).show();
            } else {
                this.$runningCmdCount.fadeOut("fast", function () {
                    $(this).html("");
                });
            }
        },

        _applyConfig: function (config) {
            this._config = {
                pinned: this._storage.getItem("terminal_pinned", config.pinned),
                maximized: this._storage.getItem(
                    "screen_maximized",
                    config.maximized
                ),
                opacity: config.opacity * 0.01,
                shortcuts: config.shortcuts,
                term_context: config.term_context || {},
                init_cmds: config.init_cmds,
            };

            this._userContext = _.extend(
                {},
                this._config.term_context,
                this._userContext
            );
        },

        _processCommandJob: function (command_info, silent = false) {
            return new Promise(async (resolve, reject) => {
                const job_index = this.onStartCommand(command_info);
                if (job_index === -1) {
                    return reject(
                        `Unexpected error: can't initialize the job!`
                    );
                }
                let result = false;
                let error = false;
                let is_failed = false;
                this.__meta = {
                    name: command_info.cmdName,
                    cmdRaw: command_info.cmdRaw,
                    def: command_info.cmdDef,
                    jobIndex: job_index,
                    silent: silent,
                };

                let _this = this;
                try {
                    if (silent) {
                        _this = _.clone(this);
                        _this.screen = _.clone(this.screen);
                        // Monkey-Patch screen print
                        _this.screen.print = () => {
                            // Do nothing.
                        };
                    }
                    result =
                        (await command_info.cmdDef.callback.call(
                            _this,
                            command_info.kwargs
                        )) || true;
                    delete this.__meta;
                } catch (err) {
                    is_failed = true;
                    error =
                        err ||
                        `[!] ${_t(
                            "Oops! Unknown error! (no detailed error message given :/)"
                        )}`;
                } finally {
                    this.onFinishCommand(job_index, is_failed, error || result);
                }
                return resolve(result);
            });
        },

        /* HANDLE EVENTS */
        onLoaded: function (config, info) {
            this._applyConfig(config);
            window.__OdooTerminal.raw_server_info = info;
            this._wasLoaded = true;
            if (this._config.pinned) {
                this.doShow();
                this.$(".terminal-screen-icon-pin")
                    .removeClass("btn-dark")
                    .addClass("btn-light");
            }
            if (this._config.maximized) {
                this.$el.addClass("term-maximized");
                this.$(".terminal-screen-icon-maximize")
                    .removeClass("btn-dark")
                    .addClass("btn-light");
            }
        },

        onStartCommand: function (command_info) {
            const job_info = {
                cmdInfo: command_info,
                healthy: true,
            };
            // Add new job on a empty space or new one
            let index = _.findIndex(this._jobs, (item) => {
                return typeof item === "undefined";
            });
            if (index === -1) {
                index = this._jobs.push(job_info) - 1;
            } else {
                this._jobs[index] = job_info;
            }
            job_info.timeout = setTimeout(() => {
                this.onTimeoutCommand(index);
            }, this._commandTimeout);
            this._updateJobsInfo();
            return index;
        },
        onTimeoutCommand: function (job_index) {
            this._jobs[job_index].healthy = false;
            this._updateJobsInfo();
        },
        onFinishCommand: function (job_index, has_errors, result) {
            const job_info = this._jobs[job_index];
            clearTimeout(job_info.timeout);
            if (has_errors) {
                this.screen.printError(
                    `${_t("Error executing")} '${job_info.cmdInfo.cmdName}':`
                );
                if (
                    typeof result === "object" &&
                    !Object.hasOwn(result, "data") &&
                    Object.hasOwn(result, "message")
                ) {
                    this.screen.printError(result.message, true);
                } else {
                    this.screen.printError(result, true);
                }
            }
            delete this._jobs[job_index];
            this._updateJobsInfo();
        },

        _onClickTerminalCommand: function (ev) {
            if (Object.hasOwn(ev.target.dataset, "cmd")) {
                this.execute(ev.target.dataset.cmd).catch(() => {
                    // Do nothing
                });
            }
        },

        _onClickToggleMaximize: function (ev) {
            const $target = $(ev.currentTarget);
            this._config.maximized = !this._config.maximized;
            if (this._config.maximized) {
                this.$el.addClass("term-maximized");
                $target.removeClass("btn-dark").addClass("btn-light");
            } else {
                this.$el.removeClass("term-maximized");
                $target.removeClass("btn-light").addClass("btn-dark");
            }
            this._storage.setItem(
                "screen_maximized",
                this._config.maximized,
                (err) => this.screen.printHTML(err)
            );
            this.screen.scrollDown();
            this.screen.preventLostInputFocus();
        },

        _onClickToggleScreenPin: function (ev) {
            const $target = $(ev.currentTarget);
            this._config.pinned = !this._config.pinned;
            this._storage.setItem(
                "terminal_pinned",
                this._config.pinned,
                (err) => this.screen.printHTML(err)
            );
            if (this._config.pinned) {
                $target.removeClass("btn-dark").addClass("btn-light");
            } else {
                $target.removeClass("btn-light").addClass("btn-dark");
            }
            this.screen.preventLostInputFocus();
        },

        _onKeyEnter: function () {
            this.execute(this.screen.getUserInput()).catch(() => {
                // Do nothing
            });
            this._searchCommandQuery = undefined;
            this.screen.preventLostInputFocus();
        },
        _onKeyArrowUp: function () {
            if (_.isUndefined(this._searchCommandQuery)) {
                this._searchCommandQuery = this.screen.getUserInput();
            }
            const found_hist = this._doSearchPrevHistory();
            if (found_hist) {
                this.screen.updateInput(found_hist);
            }
        },
        _onKeyArrowDown: function () {
            if (_.isUndefined(this._searchCommandQuery)) {
                this._searchCommandQuery = this.screen.getUserInput();
            }
            const found_hist = this._doSearchNextHistory();
            if (found_hist) {
                this.screen.updateInput(found_hist);
            } else {
                this._searchCommandQuery = undefined;
                this.screen.cleanInput();
            }
        },
        _onKeyArrowRight: function (ev) {
            const user_input = this.screen.getUserInput();
            this._commandAssistant.lazyGetAvailableOptions(
                user_input,
                this.screen.getInputCaretStartPos(),
                (options) => {
                    this._assistantOptions = options;
                    this._selAssistanOption = -1;
                    this.screen.updateAssistantPanelOptions(
                        this._assistantOptions,
                        this._selAssistanOption
                    );
                    if (
                        user_input &&
                        ev.target.selectionStart === user_input.length
                    ) {
                        this._searchCommandQuery = user_input;
                        this._searchHistoryIter = this._inputHistory.length;
                        this._onKeyArrowUp();
                        this._searchCommandQuery = user_input;
                        this._searchHistoryIter = this._inputHistory.length;
                    }
                }
            );
        },
        _onKeyArrowLeft: function () {
            const user_input = this.screen.getUserInput();
            this._commandAssistant.lazyGetAvailableOptions(
                user_input,
                this.screen.getInputCaretStartPos(),
                (options) => {
                    this._assistantOptions = options;
                    this._selAssistanOption = -1;
                    this.screen.updateAssistantPanelOptions(
                        this._assistantOptions,
                        this._selAssistanOption
                    );
                }
            );
        },
        _onKeyTab: function () {
            const user_input = this.screen.getUserInput();
            if (_.isEmpty(user_input)) {
                return;
            }

            const parse_info = this._virtMachine
                .getInterpreter()
                .parse(user_input, {
                    needResetStores: false,
                    registeredCmds: this._registeredCmds,
                });
            const [sel_cmd_index, sel_token_index] =
                this._commandAssistant.getSelectedParameterIndex(
                    parse_info,
                    this.screen.getInputCaretStartPos()
                );
            if (sel_cmd_index === null) {
                return;
            }
            const cur_token = parse_info.inputTokens[0][sel_token_index];
            ++this._selAssistanOption;
            if (this._selAssistanOption >= this._assistantOptions.length) {
                this._selAssistanOption = 0;
            }
            const option = this._assistantOptions[this._selAssistanOption];
            if (_.isEmpty(option)) {
                return;
            }

            let res_str = `${parse_info.inputRawString.substr(
                0,
                cur_token.start
            )}${option.string}`;
            const n_caret_pos = res_str.length;
            res_str += parse_info.inputRawString.substr(cur_token.end);
            if (!_.isEmpty(res_str)) {
                this.screen.updateInput(res_str);
            }
            if (n_caret_pos !== -1) {
                this.screen.setInputCaretPos(n_caret_pos);
            }
            this.screen.updateAssistantPanelOptions(
                this._assistantOptions,
                this._selAssistanOption
            );
        },

        _onInput: function () {
            // Fish-like feature
            const user_input = this.screen.getUserInput();
            this._commandAssistant.lazyGetAvailableOptions(
                user_input,
                this.screen.getInputCaretStartPos(),
                (options) => {
                    this._assistantOptions = options;
                    this._selAssistanOption = -1;
                    this.screen.updateAssistantPanelOptions(
                        this._assistantOptions,
                        this._selAssistanOption
                    );
                    this._searchCommandQuery = user_input;
                    this._searchHistoryIter = this._inputHistory.length;
                    if (user_input) {
                        const found_hist = this._doSearchPrevHistory();
                        this.screen.updateShadowInput(found_hist || "");
                        this._searchHistoryIter = this._inputHistory.length;
                    } else {
                        this.screen.cleanShadowInput();
                    }
                }
            );
        },

        _onInputKeyUp: function (ev) {
            const question_active = this.screen.getQuestionActive();
            if (_.isEmpty(question_active)) {
                if (ev.keyCode === $.ui.keyCode.ENTER) {
                    this._onKeyEnter(ev);
                } else if (ev.keyCode === $.ui.keyCode.UP) {
                    this._onKeyArrowUp(ev);
                } else if (ev.keyCode === $.ui.keyCode.DOWN) {
                    this._onKeyArrowDown(ev);
                } else if (ev.keyCode === $.ui.keyCode.RIGHT) {
                    this._onKeyArrowRight(ev);
                } else if (ev.keyCode === $.ui.keyCode.LEFT) {
                    this._onKeyArrowLeft(ev);
                } else if (ev.keyCode === $.ui.keyCode.TAB) {
                    this._onKeyTab(ev);
                } else {
                    this._searchHistoryIter = this._inputHistory.length;
                    this._searchCommandIter = Object.keys(
                        this._registeredCmds
                    ).length;
                    this._searchCommandQuery = undefined;
                }
            } else if (ev.keyCode === $.ui.keyCode.ENTER) {
                this.screen.responseQuestion(question_active, ev.target.value);
            } else if (ev.keyCode === $.ui.keyCode.ESCAPE) {
                this.screen.rejectQuestion(
                    question_active,
                    "Operation aborted"
                );
                ev.preventDefault();
            }
        },

        _onCoreClick: function (ev) {
            // Auto-Hide
            if (
                this.$el &&
                !this.$el[0].contains(ev.target) &&
                this._isTerminalVisible() &&
                !this._config.maximized &&
                !this._config.pinned
            ) {
                this.doHide();
            }
        },
        _onCoreKeyDown: function (ev) {
            // Don't crash when press keys!
            try {
                if (
                    ev.keyCode === 27 &&
                    _.isEmpty(this.screen.getQuestionActive())
                ) {
                    // Press Escape
                    this.doHide();
                } else {
                    const keybind = window.__OdooTerminal.process_keybind(ev);
                    const keybind_str = JSON.stringify(keybind);
                    const keybind_cmds = this._config.shortcuts[keybind_str];
                    if (keybind_cmds) {
                        this.execute(keybind_cmds, false, true);
                        ev.preventDefault();
                    }
                }
            } catch (err) {
                // Do nothing
            }
        },
        _onCoreBeforeUnload: function (ev) {
            const jobs = _.compact(this._jobs);
            if (jobs.length) {
                if (
                    jobs.length === 1 &&
                    (!jobs[0] ||
                        ["reload", "login"].indexOf(jobs[0].cmdInfo.cmdName) !==
                            -1)
                ) {
                    return;
                }
                ev.preventDefault();
                ev.returnValue = "";
                this.screen.print(
                    _t(
                        "The terminal has prevented the current tab from closing due to unfinished tasks:"
                    )
                );
                this.screen.print(
                    _.map(
                        jobs,
                        (item) =>
                            `${item.cmdInfo.cmdName} <small><i>${item.cmdInfo.cmdRaw}</i></small>`
                    )
                );
                this.doShow();
            }
        },

        // NOTE: This method is only used for extension purposes
        _onWindowMessage: function (ev) {
            // We only accept messages from ourselves
            if (ev.source !== window) {
                return;
            }
            if (ev.data.type === "ODOO_TERM_CONFIG") {
                this.onLoaded(ev.data.config, ev.data.info);
            }
        },
        // NOTE-END
    });

    return Terminal;
});
