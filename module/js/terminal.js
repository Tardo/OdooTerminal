// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define('terminal.Terminal', function (require) {
    'use strict';

    var core = require('web.core');
    var rpc = require('web.rpc');
    var session = require('web.session');
    var WebClient = require('web.WebClient');
    var Class = require('web.Class');
    var AbstractTerminal = require('terminal.AbstractTerminal');

    var QWeb = core.qweb;


    var ParameterReader = Class.extend({
        INPUT_GROUP_DELIMETERS: ['"', "'"],

        _regexSanitize: null,

        init: function () {
            this._regexSanitize = new RegExp("'", 'g');
        },

        parse: function (strParams) {
            var scmd = strParams.split(' ');
            const rawParams = scmd.slice(1).join(' ');
            scmd = _.filter(scmd, function (item) {
                return item;
            });

            var c_group = [false, false];
            var mdeli = '';
            var params = [];
            for (var i in scmd) {
                var startChar = scmd[i].charAt(0);
                var endChar = scmd[i].charAt(scmd[i].length-1);
                if (c_group[0] === false &&
                    this.INPUT_GROUP_DELIMETERS.indexOf(startChar) !== -1) {
                    c_group[0] = i;
                    mdeli = startChar;
                }
                if (c_group[0] !== false && endChar === mdeli) {
                    c_group[1] = i;
                }

                if (c_group[0] !== false && c_group[1] !== false) {
                    scmd[c_group[0]] = scmd[c_group[0]].slice(1);
                    scmd[c_group[1]] = scmd[c_group[1]].slice(
                        0, scmd[c_group[1]].length-1);
                    params.push(this._sanitizeString(
                        _.clone(scmd).splice(
                            c_group[0], c_group[1]-c_group[0]+1).join(' ')));
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

        _sanitizeString: function (str) {
            return str.replace(this._regexSanitize, '"');
        },
    });

    var ParameterChecker = Class.extend({
        _validators: {},

        init: function () {
            this._validators.s = this._validateString;
            this._validators.i = this._validateInt;
        },

        validate: function (args, params) {
            var curParamIndex = 0;
            for (var i=0; i < args.length; ++i) {
                var carg = args[i];
                var optional = false;
                if (carg === '?') {
                    optional = true;
                    carg = args[++i];
                }

                var isInvalidNO = !optional && curParamIndex >= params.length;
                var isInvalidO = curParamIndex < params.length &&
                    !this._validators[carg](params[curParamIndex]);
                if (isInvalidNO || isInvalidO) {
                    return false;
                }

                ++curParamIndex;
            }

            return !curParamIndex || params.length <= curParamIndex;
        },

        _validateString: function (param) {
            return Number(param) !== parseInt(param, 10);
        },
        _validateInt: function (param) {
            return Number(param) === parseInt(param, 10);
        },
    });

    var Terminal = AbstractTerminal.extend({
        events: {
            "keydown #terminal_input": "_onInputKeyDown",
            "click #terminal_screen": "_preventLostInputFocus",
            "click .o_terminal_cmd": "_onClickTerminalCommand",
        },

        _parameterChecker: null,
        _parameterReader: null,

        /* INITIALIZE */
        init: function () {
            this._super.apply(this, arguments);

            this._parameterChecker = new ParameterChecker();
            this._parameterReader = new ParameterReader();

            $(QWeb.render('terminal')).prependTo("body");

            this._lazyStorageTerminalScreen = _.debounce(function () {
                this._storage.setItem('terminal_screen', this.$term.html());
            }.bind(this), 350);
        },

        start: function () {
            this._super.apply(this, arguments);

            this.$el[0].addEventListener('toggle', this.do_toggle.bind(this));

            this.$('.terminal-prompt').val(this.PROMPT);

            this.$input = this.$('#terminal_input');
            this.$term = this.$('#terminal_screen');

            core.bus.on('keydown', this, this._onCoreKeyDown);
            core.bus.on('click', this, this._onCoreClick);

            var cachedScreen = this._storage.getItem('terminal_screen');
            if (_.isUndefined(cachedScreen)) {
                this._printWelcomeMessage();
                this.print('');
            } else {
                this._printHTML(cachedScreen);
            }
            var cachedHistory = this._storage.getItem('terminal_history');
            if (!_.isUndefined(cachedHistory)) {
                this._inputHistory = cachedHistory;
                this._searchHistoryIter = this._inputHistory.length;
            }
        },

        /* PRINT */
        _printHTML: function (html) {
            this.$term.append(html);
            this.$term[0].scrollTop = this.$term[0].scrollHeight;
            this._lazyStorageTerminalScreen();
        },

        print: function (msg, enl) {
            this._printHTML("<span>");
            this._printHTML(msg);
            this._printHTML("</span>");
            if (!enl) {
                this._printHTML("<br>");
            }
        },

        eprint: function (msg, enl) {
            this.print(document.createTextNode(msg), enl);
        },

        printTable: function (columns, tbody) {
            this.print(_.template(`<table class="print-table">
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
            }));
        },

        /* BASIC FUNCTIONS */
        clean: function () {
            this.$term.html('');
            this._storage.removeItem('terminal_screen');
        },

        cleanInput: function () {
            this.$input.val('');
        },

        cleanInputHistory: function () {
            this._inputHistory = [];
            this._storage.removeItem('terminal_screen');
        },

        registerCommand: function (cmd, cmdDef) {
            this._registeredCmds[cmd] = _.extend({
                definition: 'Undefined command',
                callback: this._fallbackExecuteCommand,
                detail: "This command hasn't a properly detailed information",
                syntaxis: 'Unknown',
                args: '',
            }, cmdDef);
        },

        executeCommand: function (cmd) {
            var self = this;
            var scmd = this._parameterReader.parse(cmd);
            if (Object.prototype.hasOwnProperty.call(this._registeredCmds,
                scmd.cmd)) {
                var cmdDef = this._registeredCmds[scmd.cmd];
                if (this._parameterChecker.validate(cmdDef.args, scmd.params)) {
                    cmdDef.callback.bind(this)(scmd.params)
                        .then(null, function (emsg) {
                            var errorMessage =
                                self._getCommandErrorMessage(emsg);
                            self.eprint(_.template("[!] Error executing " +
                                "'<%= cmd %>': <%= error %>")({
                                cmd: cmd,
                                error: errorMessage,
                            }));
                            return false;
                        });
                } else {
                    this.print(_.template("<span class='o_terminal_click " +
                        "o_terminal_cmd' data-cmd='help <%= cmd %>'>[!] " +
                        "Invalid command parameters!</span>")({cmd:scmd.cmd}));
                    return false;
                }
            } else {
                const similar_cmd = this._searchSimiliarCommand(scmd.cmd);
                if (similar_cmd) {
                    this.print(_.template("Unknown command. Did you mean " +
                        "'<strong class='o_terminal_click " +
                        "o_terminal_cmd' data-cmd='<%= cmd %> <%= params %>'>" +
                        "<%= cmd %></strong>'?")({
                        cmd: similar_cmd,
                        params: scmd.rawParams,
                    }));
                } else {
                    this.eprint("Unknown command.");
                }
            }

            return true;
        },

        /* VISIBILIY */
        do_show: function () {
            this.$el.animate({top: '0'});
            this.$input.focus();
        },

        do_hide: function () {
            this.$el.animate({top: '-100%'});
        },

        do_toggle: function () {
            if (this.$el.css('top') === '0px') {
                this.do_hide();
            } else {
                this.do_show();
            }
        },

        /* GENERAL */
        setActiveWidget: function (widget) {
            this._active_widget = widget;
        },

        setActiveAction: function (action) {
            this._active_action = action;
        },


        /* PRIVATE METHODS*/
        _printWelcomeMessage: function () {
            this.print(_.template("<strong class='o_terminal_title'>Odoo "+
                "Terminal v<%= ver %></strong>")({ver:this.VERSION}));
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
            const SCORE_LIMIT = 5;
            // Columns per Key and Rows per Key
            const cpk = 10, rpk = 3;
            const _get_key_dist = function (from, to) {
                // FIXME: Inaccurate keymap
                //      '_' and '-' positions are only valid for spanish layout
                const keymap = [
                    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
                    'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', null,
                    'z', 'x', 'c', 'v', 'b', 'n', 'm', '_', '-', null,
                ];
                const _get_key_pos2d = function (key) {
                    const i = keymap.indexOf(key);
                    if (i === -1) {
                        return [cpk, rpk];
                    }
                    return [parseInt(i/cpk, 10), i%rpk];
                };

                const from_pos = _get_key_pos2d(from);
                const to_pos = _get_key_pos2d(to);
                const x = (to_pos[0] - from_pos[0]) * (to_pos[0] - from_pos[0]);
                const y = (to_pos[1] - from_pos[1]) * (to_pos[1] - from_pos[1]);
                return Math.sqrt(x + y);
            };

            const sanitized_in_cmd = in_cmd.toLowerCase()
                .replace(/^[^a-z]+|[^a-z]+$/g, '').trim();
            var sortedCmdKeys = _.keys(this._registeredCmds).sort();
            var min_score = [0, ''];
            for (var cmd of sortedCmdKeys) {
                // Penalize word length diff
                var cmd_score = Math.abs(sanitized_in_cmd.length - cmd.length);
                // Analize letter key distances
                for (var i=0; i<sanitized_in_cmd.length; ++i) {
                    if (i < cmd.length) {
                        cmd_score += _get_key_dist(
                            sanitized_in_cmd.charAt(i), cmd.charAt(i));
                    } else {
                        break;
                    }
                }

                // Search lower score
                // if zero = perfect match (this never should happens)
                if (min_score[1] === '' || cmd_score < min_score[0]) {
                    min_score[0] = cmd_score;
                    min_score[1] = cmd;
                    if (min_score[0] === 0) {
                        break;
                    }
                }
            }

            return min_score[0] < SCORE_LIMIT ? min_score[1] : false;
        },

        _doSearchCommand: function () {
            var self = this;
            var matchCmds = _.filter(
                _.keys(this._registeredCmds).sort(), function (item) {
                    return item.indexOf(self._searchCommandQuery) === 0;
                });

            if (!matchCmds.length) {
                this._searchCommandIter = 0;
                return false;
            } else if (this._searchCommandIter >= matchCmds.length) {
                this._searchCommandIter = 0;
            }
            return matchCmds[this._searchCommandIter++];
        },

        _processInputCommand: function () {
            var cmd = this.$input.val();
            if (cmd) {
                var self = this;
                self.$input.append(
                    _.template("<option><%= cmd %></option>")({cmd:cmd}));
                self.eprint(_.template("<%= prompt %> <%= cmd %>")({
                    prompt: this.PROMPT,
                    cmd:cmd,
                }));
                this._inputHistory.push(cmd);
                this._storage.setItem('terminal_history', this._inputHistory);
                this.cleanInput();
                this.executeCommand(cmd);
            }
            this._preventLostInputFocus();
        },

        _callAlias: function (alias, params) {
            var self = this;
            return rpc.query({
                method: 'search_read',
                domain: [['name', '=', alias]],
                model: 'terminal.alias',
                fields: ['command'],
                kwargs: {context: session.user_context},
            }).then(function (results) {
                if (results.length) {
                    var cmd = results[0].command;
                    for (var i in params) {
                        cmd = cmd.replace('$'+(Number(i)+1), params[i]);
                    }
                    self.executeCommand(cmd);
                } else {
                    self.print(
                        _.template("[!] '<%= cmd %>' command not found")(
                            {cmd:alias}));
                }
            });
        },

        _fallbackExecuteCommand: function () {
            var defer = $.Deferred(function (d) {
                d.reject("Invalid command definition!");
            });
            return $.when(defer);
        },

        /* HANDLE EVENTS */
        _preventLostInputFocus: function () {
            this.$input.focus();
        },

        _onClickTerminalCommand: function (ev) {
            if (Object.prototype.hasOwnProperty.call(ev.target.dataset,
                'cmd')) {
                var cmd = ev.target.dataset.cmd;
                this.eprint(_.template("<%= prompt %> <%= cmd %>")({
                    prompt: this.PROMPT,
                    cmd:cmd,
                }));
                this.executeCommand(cmd);
            }
        },

        _onInputKeyDown: function (ev) {
            if (ev.keyCode === 13) {
                // Press Enter
                this._processInputCommand();
                this._searchHistoryIter = this._inputHistory.length;
            } else if (ev.keyCode === 38) {
                // Press Up
                if (this._searchHistoryIter > 0) {
                    --this._searchHistoryIter;
                    this.$input.val(
                        this._inputHistory[this._searchHistoryIter]);
                }
            } else if (ev.keyCode === 40) {
                // Press Down
                if (this._searchHistoryIter < this._inputHistory.length-1) {
                    ++this._searchHistoryIter;
                    this.$input.val(
                        this._inputHistory[this._searchHistoryIter]);
                } else {
                    this._searchHistoryIter = this._inputHistory.length;
                    this.cleanInput();
                }
            }

            if (ev.keyCode === 9) {
                // Press Tab
                if (this.$input.val()) {
                    if (!this._searchCommandQuery) {
                        this._searchCommandQuery = this.$input.val();
                    }
                    var found_cmd = this._doSearchCommand();
                    if (found_cmd) {
                        this.$input.val(found_cmd + ' ');
                    }
                }
                ev.preventDefault();
            } else {
                this._searchCommandIter = 0;
                this._searchCommandQuery = false;
            }
        },

        _onCoreClick: function (ev) {
            // Auto-Hide
            if (!this.$el[0].contains(ev.target)) {
                this.do_hide();
            }
        },
        _onCoreKeyDown: function (ev) {
            if (ev.ctrlKey && ev.keyCode === 49) {
                // Press Ctrl + 1
                ev.preventDefault();
                this.do_toggle();
            }
        },
    });

    /* Instantiate Terminal */
    WebClient.include({
        terminal: null,

        show_application: function () {
            this.terminal = new Terminal(this);
            this.terminal.setElement(this.$el.parents().find('#terminal'));
            this.terminal.start();
            core.bus.on('toggle_terminal', this, function () {
                this.terminal.do_toggle();
            });
            return this._super.apply(this, arguments);
        },

        current_action_updated: function (action, controller) {
            this._super.apply(this, arguments);
            if (this.terminal) {
                if (controller && controller.widget) {
                    this.terminal.setActiveWidget(
                        controller && controller.widget);
                } else {
                    this.terminal.setActiveWidget(action.widget);
                }
                this.terminal.setActiveAction(action);
            }
        },
    });

    return {
        'terminal': Terminal,
        'parameterReader': ParameterReader,
        'parameterChecker': ParameterChecker,
    };
});
