// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


odoo.define('terminal.CommonFunctions', function (require) {
    'use strict';

    const rpc = require('web.rpc');
    const ajax = require('web.ajax');
    const session = require('web.session');
    const Terminal = require('terminal.Terminal').terminal;


    Terminal.include({
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand('create', {
                definition: 'Create new record',
                callback: this._createModelRecord,
                detail: 'Open new model record in form view or directly.',
                syntaxis: '<STRING: MODEL NAME> "[DICT: VALUES]"',
                args: 's?s',
            });
            this.registerCommand('unlink', {
                definition: 'Unlink record',
                callback: this._unlinkModelRecord,
                detail: 'Delete a record.',
                syntaxis: '<STRING: MODEL NAME> <INT: RECORD ID>',
                args: 'si',
            });
            this.registerCommand('write', {
                definition: 'Update record values',
                callback: this._writeModelRecord,
                detail: 'Update record values.',
                syntaxis: '<STRING: MODEL NAME> <INT: RECORD ID> ' +
                    '"<DICT: NEW VALUES>"',
                args: 'sis',
            });
            this.registerCommand('search', {
                definition: 'Search model record/s',
                callback: this._searchModelRecord,
                detail: 'Launch orm search query.<br>&lt;FIELDS&gt; ' +
                    'are separated by commas.',
                syntaxis: '<STRING: MODEL NAME> <STRING: FIELDS> ' +
                    '"[ARRAY: DOMAIN]" [INT: LIMIT]',
                args: 'ss?s?i',
            });
            this.registerCommand('call', {
                definition: 'Call model method',
                callback: this._callModelMethod,
                detail: 'Call model method.',
                syntaxis: '<STRING: MODEL> <STRING: METHOD> "[ARRAY: ARGS]"',
                args: 'ss?s',
            });
            this.registerCommand('upgrade', {
                definition: 'Upgrade a module',
                callback: this._upgradeModule,
                detail: 'Launch upgrade module process.',
                syntaxis: '<STRING: MODULE NAME>',
                args: 's',
            });
            this.registerCommand('install', {
                definition: 'Install a module',
                callback: this._installModule,
                detail: 'Launch module installation process.',
                syntaxis: '<STRING: MODULE NAME>',
                args: 's',
            });
            this.registerCommand('uninstall', {
                definition: 'Uninstall a module',
                callback: this._uninstallModule,
                detail: 'Launch module deletion process.',
                syntaxis: '<STRING: MODULE NAME>',
                args: 's',
            });
            this.registerCommand('settings', {
                definition: 'Open settings page',
                callback: this._openSettings,
                detail: 'Open settings page.',
                syntaxis: '',
                args: '',
            });
            this.registerCommand('reload', {
                definition: 'Reload current page',
                callback: this._reloadPage,
                detail: 'Reload current page.',
                syntaxis: '',
                args: '',
            });
            this.registerCommand('debug', {
                definition: 'Set debug mode',
                callback: this._setDebugMode,
                detail: 'Set debug mode:<br>- 0: Disabled<br>- 1: ' +
                    'Enabled<br>- 2: Enabled with Assets',
                syntaxis: '<INT: MODE>',
                args: 'i',
            });
            this.registerCommand('action', {
                definition: 'Call action',
                callback: this._callAction,
                detail: 'Call action.<br>&lt;ACTION&gt; Can be an ' +
                    'string or object.',
                syntaxis: '"<STRING|DICT: ACTION>"',
                args: 's',
            });
            this.registerCommand('post', {
                definition: 'Send POST request',
                callback: this._postData,
                detail: 'Send POST request to selected controller url',
                syntaxis: '<STRING: CONTROLLER URL> "<DICT: DATA>"',
                args: 'ss',
            });
            this.registerCommand('whoami', {
                definition: 'Know current user login',
                callback: this._showWhoAmI,
                detail: 'Shows current user login',
                syntaxis: '',
                args: '',
            });
            this.registerCommand('caf', {
                definition: 'Check model fields access',
                callback: this._checkFieldAccess,
                detail: 'Show a list of model fields with access rights',
                syntaxis:
                    '<STRING: MODEL> "[ARRAY: FIELDS]"',
                args: 's?s',
            });
            this.registerCommand('cam', {
                definition: 'Check model access',
                callback: this._checkModelAccess,
                detail: 'Check if can do the selected operation<br>' +
                        "&lt;OPERATION&gt; Can be 'create', 'read', 'write'" +
                        " or 'unlink'",
                syntaxis:
                    '<STRING: MODEL> <STRING: OPERATION>',
                args: 'sss',
            });
        },

        _checkModelAccess: function (params) {
            const model = params[0];
            const operation = params[1];
            return rpc.query({
                method: 'check_access_rights',
                model: model,
                args: [operation, false],
                kwargs: {context: session.user_context},
            }).then((result) => {
                if (result) {
                    this.print(`Nice! you can '${operation}' on ${model}`);
                } else {
                    this.print(`You can't '${operation}' on ${model}`);
                }
            });
        },

        _checkFieldAccess: function (params) {
            const model = params[0];
            const fields = params[1] || "false";
            return rpc.query({
                method: 'fields_get',
                model: model,
                args: [JSON.parse(fields)],
                kwargs: {context: session.user_context},
            }).then((result) => {
                const keys = Object.keys(result);
                const fieldParams = [
                    'type', 'string', 'relation', 'required',
                    'readonly', 'searchable', 'depends',
                ];

                let body = '';
                for (const field of keys) {
                    body += "<tr>";
                    body += `<td>${field}</td>`;
                    const fieldDef = result[field];
                    for (const param of fieldParams) {
                        body += `<td>${fieldDef[param]}</td>`;
                    }
                    body += "</tr>";
                }
                fieldParams.unshift('field');
                this.printTable(fieldParams, body);
            });
        },

        _showWhoAmI: function () {
            const self = this;
            const uid = window.odoo.session_info.uid ||
                window.odoo.session_info.user_id;
            return rpc.query({
                method: 'search_read',
                domain: [['id', '=', uid]],
                fields: ['login'],
                model: 'res.users',
                kwargs: {context: session.user_context},
            }).then((result) => {
                if (result.length) {
                    self.print(result[0].login);
                } else {
                    self.print("[!] Oops! can't get the login :/");
                }
            });
        },

        _setDebugMode: function (params) {
            const mode = Number(params[0]);
            if (mode === 0) {
                this.print(
                    "Debug mode <strong>disabled</strong>. Reloading page...");
                const qs = $.deparam.querystring();
                delete qs.debug;
                window.location.search = '?' + $.param(qs);
            } else if (mode === 1) {
                this.print(
                    "Debug mode <strong>enabled</strong>. Reloading page...");
                window.location = $.param.querystring(
                    window.location.href, 'debug=');
            } else if (mode === 2) {
                this.print(
                    "Debug mode with assets <strong>enabled</strong>. " +
                    "Reloading page...");
                window.location = $.param.querystring(
                    window.location.href, 'debug=assets');
            } else {
                this.print("[!] Invalid debug mode");
            }

            return $.when();
        },

        _reloadPage: function () {
            return $.when($.Deferred((d) => {
                try {
                    location.reload();
                    d.resolve();
                } catch (err) {
                    d.reject(err.message);
                }
            }));
        },

        _searchModule: function (module) {
            return rpc.query({
                method: 'search_read',
                domain: [['name', '=', module]],
                fields: ['name'],
                model: 'ir.module.module',
                kwargs: {context: session.user_context},
            });
        },

        _upgradeModule: function (params) {
            const module = params[0];
            const self = this;
            return this._searchModule(module).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: 'button_immediate_upgrade',
                        model: 'ir.module.module',
                        args: [result[0].id],
                    }).then(() => {
                        self.print(`'${module}' module successfully upgraded`);
                    }, () => {
                        self.print(`[!] Can't upgrade '${module}' module`);
                    });
                } else {
                    self.print(`[!] '${module}' module doesn't exists`);
                }
            });
        },

        _installModule: function (params) {
            const module = params[0];
            const self = this;
            return this._searchModule(module).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: 'button_immediate_install',
                        model: 'ir.module.module',
                        args: [result[0].id],
                    }).then(() => {
                        self.print(`'${module}' module successfully installed`);
                    }, () => {
                        self.print(`[!] Can't install '${module}' module`);
                    });
                } else {
                    self.print(`[!] '${module}' module doesn't exists`);
                }
            });
        },

        _uninstallModule: function (params) {
            const module = params[0];
            const self = this;
            return this._searchModule(module).then((result) => {
                if (result.length) {
                    rpc.query({
                        method: 'button_immediate_uninstall',
                        model: 'ir.module.module',
                        args: [result[0].id],
                    }).then(() => {
                        self.print(`'${module}' module successfully
                            uninstalled`);
                    }, () => {
                        self.print(`[!] Can't uninstall '${module}' module`);
                    });
                } else {
                    self.print(`[!] '${module}' module doesn't exists`);
                }
            });
        },

        _callModelMethod: function (params) {
            const model = params[0];
            const method = params[1];
            const args = params[2] || "[]";
            const self = this;
            return rpc.query({
                method: method,
                model: model,
                args: JSON.parse(args),
                kwargs: {context: session.user_context},
            }).then((result) => {
                self.print(result);
            });
        },

        _searchModelRecord: function (params) {
            const model = params[0];
            const fields = params[1]==='*'?false:params[1].split(',');
            const domain = params[2] || "[]";
            const limit = Number(params[3]) || false;
            const self = this;
            return rpc.query({
                method: 'search_read',
                domain: JSON.parse(domain),
                fields: fields,
                model: model,
                limit: limit,
                kwargs: {context: session.user_context},
            }).then((result) => {
                let tbody = '';
                const columns = ['id'];
                for (const item of result) {
                    tbody += '<tr>';
                    tbody += _.template("<td><span class='o_terminal_click " +
                        "o_terminal_view' data-resid='<%= id %>' " +
                        "data-model='<%= model %>'>#<%= id %></span></td>")({
                        id:item.id,
                        model:model,
                    });
                    delete item.id;
                    for (const field in item) {
                        columns.push(field);
                        tbody += `<td>${item[field]}</td>`;
                    }
                    tbody += "</tr>";
                }
                self.printTable(_.unique(columns), tbody);
            });
        },

        _createModelRecord: function (params) {
            const model = params[0];
            const self = this;
            if (params.length === 1) {
                return this.do_action({
                    type: 'ir.actions.act_window',
                    res_model: model,
                    views: [[false, 'form']],
                    target: 'current',
                }).then(() => {
                    self.do_hide();
                });
            }
            const values = params[1];
            return rpc.query({
                method: 'create',
                model: model,
                args: [JSON.parse(values)],
                kwargs: {context: session.user_context},
            }).then((result) => {
                self.print(_.template("<%= model %> record created " +
                    "successfully: <span class='o_terminal_click " +
                    "o_terminal_view' data-resid='<%= new_id %>' " +
                    "data-model='<%= model %>'><%= new_id %></span>")({
                    model: model,
                    new_id: result,
                }));
            });
        },

        _unlinkModelRecord: function (params) {
            const model = params[0];
            const record_id = parseInt(params[1], 10);
            const self = this;
            return rpc.query({
                method: 'unlink',
                model: model,
                args: [record_id],
                kwargs: {context: session.user_context},
            }).then(() => {
                self.print(`${model} record deleted successfully`);
            });
        },

        _writeModelRecord: function (params) {
            const model = params[0];
            const record_id = parseInt(params[1], 10);
            let values = params[2];
            try {
                values = JSON.parse(values);
            } catch (err) {
                const defer = $.Deferred((d) => {
                    d.reject(err.message);
                });
                return $.when(defer);
            }
            const self = this;
            return rpc.query({
                method: 'write',
                model: model,
                args: [record_id, values],
                kwargs: {context: session.user_context},
            }).then(() => {
                self.print(`${model} record updated successfully`);
            });
        },

        _openSettings: function () {
            const self = this;
            return this.do_action({
                type: 'ir.actions.act_window',
                res_model: 'res.config.settings',
                views: [[false, 'form']],
                target: 'current',
            }).then(() => {
                self.do_hide();
            });
        },

        _callAction: function (params) {
            let action = params[0];
            try {
                action = JSON.parse(action);
            } catch (err) {
                // Do Nothing
            }
            return this.do_action(action);
        },

        _postData: function (params) {
            const url = params[0];
            const data = params[1];
            const self = this;
            return ajax.post(url, JSON.parse(data)).then((results) => {
                self.eprint(results);
            });
        },
    });

});
