// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


odoo.define('terminal.CoreFunctions', function (require) {
    'use strict';

    var Terminal = require('terminal.Terminal').terminal;


    Terminal.include({
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand('help', {
                definition: 'Print this help or command detailed info',
                callback: this._printHelp,
                detail: 'Show commands and a quick definition.<br/>- ' +
                    '<> ~> Required Parameter<br/>- [] ~> Optional Parameter',
                syntaxis: '[STRING: COMMAND]',
                args: '?s',
            });

            this.registerCommand('clear', {
                definition: 'Clean terminal section (screen by default)',
                callback: this._clear,
                detail: 'Available sections: screen (default), history.',
                syntaxis: '[STRING: SECTION]',
                args: '?s',
            });

            this.registerCommand('print', {
                definition: 'Print a message',
                callback: this._printEval,
                detail: 'Eval parameters and print the result.',
                syntaxis: '<MSG>',
                args: '',
            });
        },

        _printHelp: function (params) {
            if (!params || params.length === 0) {
                const sortedCmdKeys = _.keys(this._registeredCmds).sort();
                for (const cmd of sortedCmdKeys) {
                    this._printHelpSimple(cmd, this._registeredCmds[cmd]);
                }
            } else {
                const cmd = params[0];
                if (Object.prototype.hasOwnProperty.call(this._registeredCmds,
                    cmd)) {
                    this._printHelpDetailed(cmd, this._registeredCmds[cmd]);
                } else {
                    this.print(`[!] '${cmd}' command doesn't exists`);
                }
            }

            return $.when();
        },

        _printHelpSimple: function (cmd, cmdDef) {
            this.print(_.template("<strong class='o_terminal_click " +
                "o_terminal_cmd' data-cmd='help <%= cmd %>'><%= cmd %>" +
                "</strong> - <i><%= def %></i>")({
                cmd:cmd,
                def:cmdDef.definition,
            }));
        },

        _printHelpDetailed: function (cmd, cmdDef) {
            this.print(cmdDef.detail);
            this.print(" ");
            this.eprint(`Syntaxis: ${cmd} ${cmdDef.syntaxis}`);
        },


        _printWelcomeMessage: function () {
            this._super.apply(this, arguments);
            this.print("Type '<i class='o_terminal_click o_terminal_cmd' " +
                "data-cmd='help'>help</i>' or '<i class='o_terminal_click " +
                "o_terminal_cmd' data-cmd='help help'>help " +
                "&lt;command&gt;</i>' to start.");
        },

        _clear: function (params) {
            const self = this;
            const defer_clean = $.Deferred((d) => {
                if (params.length && params[0] === 'history') {
                    self.cleanInputHistory();
                } else {
                    self.clean();
                }
                d.resolve();
            });
            return $.when(defer_clean);
        },

        _printEval: function (params) {
            const self = this;
            return $.when($.Deferred((d) => {
                let msg = params.join(' ');
                try {
                    // Ignore linter warning
                    // eslint-disable-next-line
                    msg = eval(msg);
                } catch (err) {
                    // Do Nothing
                } finally {
                    self.print(msg);
                    d.resolve();
                }
            }));
        },
    });

});
