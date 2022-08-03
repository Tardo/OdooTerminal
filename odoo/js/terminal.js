// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.Terminal", function (require) {
    "use strict";

    const core = require("web.core");
    const session = require("web.session");
    const Widget = require("web.Widget");
    const Screen = require("terminal.core.Screen");
    const Longpolling = require("terminal.core.Longpolling");
    const ParameterReader = require("terminal.core.ParameterReader");
    const TemplateManager = require("terminal.core.TemplateManager");
    const Storage = require("terminal.core.Storage");
    const CommandAssistant = require("terminal.core.CommandAssistant");

    const QWeb = core.qweb;
    const _t = core._t;
    const _lt = core._lt;

    const Terminal = Widget.extend({
        VERSION: "8.5.1",

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

        _registeredCmds: {},
        _inputHistory: [],
        _searchCommandIter: 0,
        _searchCommandQuery: "",
        _searchHistoryIter: 0,

        _storage: null,
        _longpolling: null,

        _hasExecInitCmds: false,
        _userContext: {active_test: false},

        _commandTimeout: 30000,
        _errorCount: 0,

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

        init: function (parent, mode) {
            this._super.apply(this, arguments);
            this._mode = mode;
            this._buffer = {};
            this._storage = new Storage.StorageSession();
            this._storageLocal = new Storage.StorageLocal();
            try {
                this._longpolling = new Longpolling(this);
            } catch (err) {
                // This happens if 'bus' module is not installed
                this._longpolling = false;
            }
            this._templates = new TemplateManager();
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
            this._parameterReader = new ParameterReader();
            this._commandAssistant = new CommandAssistant(this);
            this._jobs = [];
            this._errorCount = 0;

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

            // Pinned
            this._pinned = this._storage.getItem("terminal_pinned");

            this._createTerminal();
        },

        start: function () {
            if (!this._wasLoaded) {
                return Promise.reject();
            }

            return new Promise(async (resolve, reject) => {
                try {
                    await this._super.apply(this, arguments);
                    await this.screen.start(this.$el);
                } catch (err) {
                    return reject(err);
                }

                this.$runningCmdCount = this.$("#terminal_running_cmd_count");

                const isMaximized = this._storage.getItem("screen_maximized");
                if (isMaximized) {
                    this.$el.addClass("term-maximized");
                    this.$(".terminal-screen-icon-maximize")
                        .removeClass("btn-dark")
                        .addClass("btn-light");
                }

                this._wasStart = true;
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

        getAliasCommand: function (cmd_name) {
            const aliases =
                this._storageLocal.getItem("terminal_aliases") || {};
            return aliases[cmd_name];
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
                    sanitized: true,
                    generators: true,
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

        executeCommand: function (cmd_raw, store = true, silent = false) {
            return new Promise(async (resolve, reject) => {
                let cmd = cmd_raw || "";
                const cmd_split = cmd_raw.split(" ");
                const cmd_name = cmd_split[0];
                if (!cmd_name) {
                    return reject();
                }

                try {
                    cmd = await this._resolveRunners(cmd);
                } catch (err) {
                    return reject(err);
                }
                let cmd_def = this._registeredCmds[cmd_name];
                let scmd = {};

                try {
                    // Stop execution if the command doesn't exists
                    if (!cmd_def) {
                        [, cmd_def] = this._searchCommandDefByAlias(cmd_name);
                        if (!cmd_def) {
                            const cmd_res =
                                await this._alternativeExecuteCommand(
                                    cmd,
                                    store,
                                    silent
                                );
                            return resolve(cmd_res);
                        }
                    }

                    this._parameterReader.resetStores();
                    scmd = this._parameterReader.parse(cmd, cmd_def);
                } catch (err) {
                    if (!silent) {
                        this.screen.printCommand(cmd);
                    }
                    this.screen.printError(
                        `<span class='o_terminal_click ` +
                            `o_terminal_cmd' data-cmd='help ${cmd_name}'>` +
                            `${err}!</span>`
                    );
                    if (store && !cmd_def.secured) {
                        this._storeUserInput(cmd_raw);
                    }
                    this.screen.cleanInput();
                    return reject(err);
                }
                if (store && !cmd_def.secured) {
                    this._storeUserInput(cmd_raw);
                }
                if (!silent) {
                    this.screen.printCommand(cmd_raw, cmd_def.secured);
                }
                this.screen.cleanInput();
                const res = await this._processCommandJob(
                    scmd,
                    cmd_def,
                    silent
                );
                return resolve(res);
            });
        },

        _executeCommands: function (cmds_raw) {
            // Filter comments
            const cmds = _.filter(cmds_raw, function (item) {
                return item && item[0] !== "/" && item[1] !== "/";
            });
            const cmds_len = cmds.length;
            for (
                let x = 0;
                x < cmds_len;
                this.executeCommand(cmds[x++], false)
            );
        },

        /* VISIBILIY */
        doShow: function () {
            if (!this._wasLoaded) {
                return Promise.resolve();
            }
            const doTransition = () => {
                this.$el.addClass("terminal-transition-topdown");
                this.screen.focus();
            };
            // Only start the terminal if needed
            if (!this._wasStart) {
                return this.start().then(() => {
                    this.screen.flush();
                    doTransition();
                });
            }
            doTransition();

            return Promise.resolve();
        },

        doHide: function () {
            this.$el.removeClass("terminal-transition-topdown");
        },

        doToggle: function () {
            if (this._isTerminalVisible()) {
                this.doHide();
            } else {
                this.doShow();
            }
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

        _resolveRunners: function (cmd) {
            return new Promise(async (resolve, reject) => {
                const pp_values = this._parameterReader.preparse(cmd);
                const tasks = [];
                for (const runner of pp_values.runners) {
                    tasks.push(this.executeCommand(runner.cmd, false, true));
                }
                let pp_cmd = pp_values.cmd;
                try {
                    const results = await Promise.all(tasks);
                    for (const index in results) {
                        let value = results[index];
                        const ext = pp_values.runners[index].ext;
                        if (_.isArray(value)) {
                            if (ext) {
                                value = _.map(value, (item) => item[ext]).join(
                                    ","
                                );
                            } else {
                                value = _.map(value, (item) =>
                                    JSON.stringify(item)
                                ).join(",");
                            }
                        } else if (ext && _.isObject(value)) {
                            value = value[ext];
                        }
                        pp_cmd = pp_cmd.replace(`=={${index}}`, value);
                    }
                } catch (err) {
                    return reject(err);
                }
                return resolve(pp_cmd);
            });
        },

        _alternativeExecuteCommand: function (
            cmd_raw,
            store = true,
            silent = false
        ) {
            const cmd = cmd_raw || "";
            const cmd_split = cmd_raw.split(" ");
            const cmd_name = cmd_split[0];
            // Try alias
            let alias_cmd = this.getAliasCommand(cmd_name);
            if (alias_cmd) {
                const scmd = this._parameterReader.parse(cmd);
                const params_len = scmd.params.length;
                let index = 0;
                while (index < params_len) {
                    const re = new RegExp(
                        `\\$${Number(index) + 1}(?:\\[[^\\]]+\\])?`,
                        "g"
                    );
                    alias_cmd = alias_cmd.replaceAll(re, scmd.params[index]);
                    ++index;
                }
                alias_cmd = alias_cmd.replaceAll(
                    /\$\d+(?:\[([^\]]+)\])?/g,
                    (match, group) => {
                        return group || "";
                    }
                );
                if (store) {
                    this._storeUserInput(cmd);
                }
                return this.executeCommand(alias_cmd, false, silent);
            }

            if (!silent) {
                this.screen.printCommand(cmd);
            }
            // Search similar commands
            const similar_cmd = this._searchSimiliarCommand(cmd_name);
            if (similar_cmd) {
                this.screen.print(
                    this._templates.render("UNKNOWN_COMMAND", {
                        cmd: similar_cmd,
                        params: cmd_split.slice(1),
                    })
                );
            } else {
                this.screen.eprint(_t("Unknown command."));
            }
            if (store) {
                this._storeUserInput(cmd);
            }
            this.screen.cleanInput();
            return Promise.resolve();
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
                this._templates.render("WELCOME", {ver: this.VERSION})
            );
        },

        _searchCommandDefByAlias: function (cmd) {
            const cmd_keys = _.keys(this._registeredCmds);
            const cmd_keys_len = cmd_keys.length;
            let index = 0;
            while (index < cmd_keys_len) {
                const cmd_name = cmd_keys[index];
                const cmd_def = this._registeredCmds[cmd_name];
                if (cmd_def.aliases.indexOf(cmd) !== -1) {
                    return [cmd_name, cmd_def];
                }
                ++index;
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
        _searchSimiliarCommand: function (in_cmd) {
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
                const _get_key_pos2d = function (key) {
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

        _doSearchNextHistory: function () {
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

        _processCommandJob: function (scmd, cmd_def, silent = false) {
            return new Promise(async (resolve) => {
                const job_index = this.onStartCommand(scmd, cmd_def);
                let result = false;
                let error = false;
                let is_failed = false;
                try {
                    this.__meta = {
                        name: scmd.cmd,
                        cmdRaw: scmd.cmdRaw,
                        def: cmd_def,
                        jobIndex: job_index,
                        silent: silent,
                    };

                    let _this = this;
                    if (silent) {
                        _this = _.clone(this);
                        _this.screen = _.clone(this.screen);
                        // Monkey-Patch screen print
                        _this.screen.print = () => {
                            // Do nothing.
                        };
                    }

                    result =
                        (await cmd_def.callback.call(_this, scmd.params)) ||
                        true;
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

        /* HANDLE EVENTS */
        onLoaded: function () {
            this._wasLoaded = true;
            if (this._pinned) {
                this.doShow();
                this.$(".terminal-screen-icon-pin")
                    .removeClass("btn-dark")
                    .addClass("btn-light");
            }
        },

        onStartCommand: function (scmd) {
            const job_info = {
                scmd: scmd,
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
        onFinishCommand: function (job_index, has_errors, result) {
            const job_info = this._jobs[job_index];
            clearTimeout(job_info.timeout);
            if (has_errors) {
                this.screen.printError(
                    `${_t("Error executing")} '${job_info.scmd.cmd}':`
                );
                if (
                    typeof result === "object" &&
                    !Object.prototype.hasOwnProperty.call(result, "data") &&
                    Object.prototype.hasOwnProperty.call(result, "message")
                ) {
                    this.screen.printError(result.message, true);
                } else {
                    this.screen.printError(result, true);
                }
            }
            delete this._jobs[job_index];
            this._updateJobsInfo();
        },
        onTimeoutCommand: function (job_index) {
            this._jobs[job_index].healthy = false;
            this._updateJobsInfo();
        },

        _onClickTerminalCommand: function (ev) {
            if (
                Object.prototype.hasOwnProperty.call(ev.target.dataset, "cmd")
            ) {
                this.executeCommand(ev.target.dataset.cmd);
            }
        },

        _onClickToggleMaximize: function (ev) {
            const $target = $(ev.currentTarget);
            const is_maximized = this._storage.getItem("screen_maximized");
            if (is_maximized) {
                this.$el.removeClass("term-maximized");
                $target.removeClass("btn-light").addClass("btn-dark");
            } else {
                this.$el.addClass("term-maximized");
                $target.removeClass("btn-dark").addClass("btn-light");
            }
            this._storage.setItem("screen_maximized", !is_maximized, (err) =>
                this.screen.printHTML(err)
            );
            this.screen.scrollDown();
            this.screen.preventLostInputFocus();
        },

        _onClickToggleScreenPin: function (ev) {
            const $target = $(ev.currentTarget);
            this._pinned = !this._storage.getItem("terminal_pinned");
            this._storage.setItem("terminal_pinned", this._pinned, (err) =>
                this.screen.printHTML(err)
            );
            if (this._pinned) {
                $target.removeClass("btn-dark").addClass("btn-light");
            } else {
                $target.removeClass("btn-light").addClass("btn-dark");
            }
            this.screen.preventLostInputFocus();
        },

        _onKeyEnter: function () {
            this.executeCommand(this.screen.getUserInput());
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
            this._assistantOptions = this._commandAssistant.getAvailableOptions(
                user_input,
                this.screen.getInputCaretStartPos()
            );
            this._selAssistanOption = -1;
            this.screen.updateAssistantPanelOptions(
                this._assistantOptions,
                this._selAssistanOption
            );
            if (user_input && ev.target.selectionStart === user_input.length) {
                this._searchCommandQuery = user_input;
                this._searchHistoryIter = this._inputHistory.length;
                this._onKeyArrowUp();
                this._searchCommandQuery = user_input;
                this._searchHistoryIter = this._inputHistory.length;
            }
        },
        _onKeyArrowLeft: function () {
            const user_input = this.screen.getUserInput();
            this._assistantOptions = this._commandAssistant.getAvailableOptions(
                user_input,
                this.screen.getInputCaretStartPos()
            );
            this._selAssistanOption = -1;
            this.screen.updateAssistantPanelOptions(
                this._assistantOptions,
                this._selAssistanOption
            );
        },
        _onKeyTab: function () {
            const user_input = this.screen.getUserInput();
            if (_.isEmpty(user_input)) {
                return;
            }
            const scmd = this._parameterReader.parse(user_input);
            const caret_pos = this.screen.getInputCaretStartPos();
            const sel_param_index =
                this._commandAssistant.getSelectedParameterIndex(
                    scmd,
                    caret_pos
                );
            ++this._selAssistanOption;
            if (this._selAssistanOption >= this._assistantOptions.length) {
                this._selAssistanOption = 0;
            }
            const option = this._assistantOptions[this._selAssistanOption];
            if (_.isEmpty(option)) {
                return;
            }

            let res_str = "";
            let n_caret_pos = -1;
            if (sel_param_index === -1) {
                res_str = option.string;
                n_caret_pos = res_str.length;
                if (scmd.params.length > 0) {
                    res_str += ` ${scmd.params.join(" ")}`;
                }
            } else {
                const s_params = _.clone(scmd.params);
                if (sel_param_index >= s_params.length) {
                    s_params.push(option.string);
                } else {
                    s_params[sel_param_index] = option.string;
                    n_caret_pos = scmd.cmd.length + 1;
                    for (const index in s_params) {
                        if (index > sel_param_index) {
                            break;
                        }
                        const s_param = s_params[index];
                        n_caret_pos +=
                            s_param.length + (index < sel_param_index ? 1 : 0);
                    }
                }
                res_str = `${scmd.cmd} ${s_params.join(" ")}`;
            }
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
            this.screen.cleanShadowInput();
            const user_input = this.screen.getUserInput();
            this._assistantOptions = this._commandAssistant.getAvailableOptions(
                user_input,
                this.screen.getInputCaretStartPos()
            );
            this._selAssistanOption = -1;
            this.screen.updateAssistantPanelOptions(
                this._assistantOptions,
                this._selAssistanOption
            );
            if (user_input) {
                this._searchCommandQuery = user_input;
                this._searchHistoryIter = this._inputHistory.length;
                new Promise((resolve) => {
                    resolve(this._doSearchPrevHistory());
                }).then((found_hist) => {
                    this.screen.updateShadowInput(found_hist || "");
                });
            }
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
                !this._storage.getItem("screen_maximized") &&
                !this._pinned
            ) {
                this.doHide();
            }
        },
        _onCoreKeyDown: function (ev) {
            if (
                ev.keyCode === 27 &&
                _.isEmpty(this.screen.getQuestionActive())
            ) {
                // Press Escape
                this.doHide();
            } else if (ev.altKey && ev.key && ev.key.toLowerCase() === "t") {
                // Press Alt + t
                ev.preventDefault();
                this.doToggle();
            }
        },
        _onCoreBeforeUnload: function (ev) {
            const jobs = _.compact(this._jobs);
            if (jobs.length) {
                if (
                    jobs.length === 1 &&
                    (!jobs[0] ||
                        ["reload", "login"].indexOf(jobs[0].scmd.cmd) !== -1)
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
                            `${item.scmd.cmd} <small><i>${item.scmd.cmdRaw}</i></small>`
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
                if (!this._hasExecInitCmds) {
                    this._executeCommands(ev.data.init_cmds);
                    this._hasExecInitCmds = true;
                }
                this.onLoaded();
            }
        },
        // NOTE-END
    });

    return Terminal;
});
