// Copyright 2018-2019 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
odoo.define('terminal.BasicFunctions', function (require) {
    'use strict';

    var rpc = require('web.rpc');
    var ajax = require('web.ajax');
    var session = require('web.session');
    var dialogs = require('web.view_dialogs');
    var field_utils = require('web.field_utils');
    var Terminal = require('terminal.Terminal').terminal;


    Terminal.include({
        events: _.extend({}, Terminal.prototype.events,
            {"click .o_terminal_view": "_onClickTerminalView"}),

        setActiveAction: function (action) {
            this._super.apply(this, arguments);
            this._active_action = action;
        },

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
            this.registerCommand('view', {
                definition: 'View model record/s',
                callback: this._viewModelRecord,
                detail: 'Open model record in form view or records ' +
                    'in list view.',
                syntaxis: '<STRING: MODEL NAME> [INT: RECORD ID]',
                args: 's?i',
            });
            this.registerCommand('search', {
                definition: 'Search model record/s',
                callback: this._searchModelRecord,
                detail: 'Launch orm search query.<br/>&lt;FIELDS&gt; ' +
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
                detail: 'Set debug mode:<br/>- 0: Disabled<br/>- 1: ' +
                    'Enabled<br/>- 2: Enabled with Assets',
                syntaxis: '<INT: MODE>',
                args: 'i',
            });
            this.registerCommand('action', {
                definition: 'Call action',
                callback: this._callAction,
                detail: 'Call action.<br/>&lt;ACTION&gt; Can be an ' +
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
            this.registerCommand('metadata', {
                definition: 'Show metadata information',
                callback: this._showMetadata,
                detail: 'Show metadata info: xml & record if available',
                syntaxis: '',
                args: '',
            });
        },

        _setDebugMode: function (params) {
            var mode = Number(params[0]);
            if (mode === 0) {
                this.print(
                    "Debug mode <strong>disabled</strong>. Reloading page...");
                var qs = $.deparam.querystring();
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
            return $.when($.Deferred(function (d) {
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
            var module = params[0];
            var self = this;
            return this._searchModule(module).then(function (result) {
                if (result.length) {
                    rpc.query({
                        method: 'button_immediate_upgrade',
                        model: 'ir.module.module',
                        args: [result[0].id],
                    }).then(function () {
                        self.print(
                            _.template("'<%= module %>' module successfully " +
                                "upgraded")({module:module}));
                    }, function () {
                        self.print(_.template("[!] Can't upgrade " +
                            "'<%= module %>' module")({module:module}));
                    });
                } else {
                    self.print(_.template("[!] '<%= module %>' module " +
                        "doesn't exists")({module:module}));
                }
            });
        },

        _installModule: function (params) {
            var module = params[0];
            var self = this;
            return this._searchModule(module).then(function (result) {
                if (result.length) {
                    rpc.query({
                        method: 'button_immediate_install',
                        model: 'ir.module.module',
                        args: [result[0].id],
                    }).then(function () {
                        self.print(_.template("'<%= module %>' module " +
                            "successfully installed")({module:module}));
                    }, function () {
                        self.print(_.template("[!] Can't install " +
                            "'<%= module %>' module")({module:module}));
                    });
                } else {
                    self.print(_.template("[!] '<%= module %>' module " +
                        "doesn't exists")({module:module}));
                }
            });
        },

        _uninstallModule: function (params) {
            var module = params[0];
            var self = this;
            return this._searchModule(module).then(function (result) {
                if (result.length) {
                    rpc.query({
                        method: 'button_immediate_uninstall',
                        model: 'ir.module.module',
                        args: [result[0].id],
                    }).then(function () {
                        self.print(_.template("'<%= module %>' module " +
                            "successfully uninstalled")({module:module}));
                    }, function () {
                        self.print(_.template("[!] Can't uninstall " +
                            "'<%= module %>' module")({module:module}));
                    });
                } else {
                    self.print(_.template("[!] '<%= module %>' " +
                        "module doesn't exists")({module:module}));
                }
            });
        },

        _callModelMethod: function (params) {
            var model = params[0];
            var method = params[1];
            var args = params[2] || "[]";
            var self = this;
            return rpc.query({
                method: method,
                model: model,
                args: JSON.parse(args),
                kwargs: {context: session.user_context},
            }).then(function (result) {
                self.print(result);
            });
        },

        _searchModelRecord: function (params) {
            var model = params[0];
            var fields = params[1]==='*'?false:params[1].split(',');
            var domain = params[2] || "[]";
            var limit = Number(params[3]) || false;
            var self = this;
            return rpc.query({
                method: 'search_read',
                domain: JSON.parse(domain),
                fields: fields,
                model: model,
                limit: limit,
                kwargs: {context: session.user_context},
            }).then(function (result) {
                var tbody = '';
                var columns = ['id'];
                for (var index in result) {
                    tbody += '<tr>';
                    tbody += _.template("<td><span class='o_terminal_click " +
                        "o_terminal_view' data-resid='<%= id %>' " +
                        "data-model='<%= model %>'>#<%= id %></span></td>")({
                        id:result[index].id,
                        model:model,
                    });
                    delete result[index].id;
                    for (var field in result[index]) {
                        columns.push(field);
                        tbody += _.template(
                            "<td><%= value %></td>")({
                            value: result[index][field],
                        });
                    }
                    tbody += "</tr>";
                }
                self.printTable(_.unique(columns), tbody);
            });
        },

        _viewModelRecord: function (params) {
            var model = params[0];
            var resId = Number(params[1]) || false;
            var self = this;
            if (resId) {
                return this.do_action({
                    type: 'ir.actions.act_window',
                    name: 'View Record',
                    res_model: model,
                    res_id: resId,
                    views: [[false, 'form']],
                    target: 'new',
                }).then(function () {
                    self.do_hide();
                });
            }
            new dialogs.SelectCreateDialog(this, {
                res_model: model,
                title: 'Select a record',
                disable_multiple_selection: true,
                on_selected: function (records) {
                    self.do_action({
                        type: 'ir.actions.act_window',
                        name: 'View Record',
                        res_model: model,
                        res_id: records[0].id,
                        views: [[false, 'form']],
                        target: 'new',
                    });
                },
            }).open();

            var defer = $.Deferred(function (d) {
                d.resolve();
            });
            return $.when(defer);
        },

        _createModelRecord: function (params) {
            var model = params[0];
            var self = this;
            if (params.length === 1) {
                return this.do_action({
                    type: 'ir.actions.act_window',
                    res_model: model,
                    views: [[false, 'form']],
                    target: 'current',
                }).then(function () {
                    self.do_hide();
                });
            }
            var values = params[1];
            return rpc.query({
                method: 'create',
                model: model,
                args: [JSON.parse(values)],
                kwargs: {context: session.user_context},
            }).then(function (result) {
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
            var model = params[0];
            var record_id = parseInt(params[1], 10);
            var self = this;
            return rpc.query({
                method: 'unlink',
                model: model,
                args: [record_id],
                kwargs: {context: session.user_context},
            }).then(function () {
                self.print(_.template("<%= model %> record deleted " +
                    "successfully")({model:model}));
            });
        },

        _writeModelRecord: function (params) {
            var model = params[0];
            var record_id = parseInt(params[1], 10);
            var values = params[2];
            try {
                values = JSON.parse(values);
            } catch (err) {
                var defer = $.Deferred(function (d) {
                    d.reject(err.message);
                });
                return $.when(defer);
            }
            var self = this;
            return rpc.query({
                method: 'write',
                model: model,
                args: [record_id, values],
                kwargs: {context: session.user_context},
            }).then(function () {
                self.print(_.template("<%= model %> record updated " +
                    "successfully")({model:model}));
            });
        },

        _openSettings: function () {
            var self = this;
            return this.do_action({
                type: 'ir.actions.act_window',
                res_model: 'res.config.settings',
                views: [[false, 'form']],
                target: 'current',
            }).then(function () {
                self.do_hide();
            });
        },

        _callAction: function (params) {
            var action = params[0];
            try {
                action = JSON.parse(action);
            } catch (err) {
                // Do Nothing
            }
            return this.do_action(action);
        },

        _postData: function (params) {
            var url = params[0];
            var data = params[1];
            var self = this;
            return ajax.post(url, JSON.parse(data)).then(function (results) {
                self.eprint(results);
            });
        },

        _METADATA_VIEW_TEMPLATE: `<strong>+ ACTIVE VIEW INFO</strong><br>
            <span style='color: gray;'>XML-ID:</span> <%= id %><br>
            <span style='color: gray;'>XML-NAME:</span> <%= name %>`,

        _METADATA_RECORD_TEMPLATE: `<strong>+ CURRENT RECORD INFO</strong><br>
            <span style='color: gray;'>ID:</span> <%= id %><br>
            <span style='color: gray;'>Creator:</span>
            <span class='o_terminal_click o_terminal_cmd'
                  data-cmd='view res.users <%= uid %>'>
                <%= creator %>
            </span><br>
            <span style='color: gray;'>Creation Date:</span> <%= date %><br>
            <span style='color: gray;'>Last Modification By:</span>
            <span class='o_terminal_click o_terminal_cmd'
                  data-cmd='view res.users <%= wuid %>'>
                <%= user %>
            </span><br>
            <span style='color: gray;'>Last Modification Date:</span>
            <%= wdate %>`,

        _showMetadata: function () {
            var self = this;
            var view_id = this._get_active_view_type_id();
            if (view_id) {
                return rpc.query({
                    method: 'search_read',
                    fields: ['name', 'xml_id'],
                    domain: [['id', '=', view_id]],
                    model: 'ir.ui.view',
                    limit: 1,
                    kwargs: {context: session.user_context},
                }).then(function (results) {
                    var view = results[0];
                    self.print(_.template(self._METADATA_VIEW_TEMPLATE)({
                        id: view.xml_id,
                        name: view.name,
                    }));
                    var controllerSelectedIds = self
                        ._get_active_view_selected_ids();
                    if (controllerSelectedIds.length) {
                        self._get_metadata(controllerSelectedIds)
                            .then(function (result) {
                                var metadata = result[0];
                                metadata.creator = field_utils.format.many2one(
                                    metadata.create_uid);
                                metadata.lastModifiedBy = field_utils.format
                                    .many2one(metadata.write_uid);
                                var createDate = field_utils.parse.datetime(
                                    metadata.create_date);
                                metadata.create_date = field_utils.format
                                    .datetime(createDate);
                                var modificationDate = field_utils.parse
                                    .datetime(metadata.write_date);
                                metadata.write_date = field_utils.format
                                    .datetime(modificationDate);

                                self.print(
                                    _.template(self._METADATA_RECORD_TEMPLATE)({
                                        id: metadata.id,
                                        uid: metadata.create_uid[0],
                                        creator: metadata.creator,
                                        date: metadata.create_date,
                                        user: metadata.lastModifiedBy,
                                        wuid: metadata.write_uid[0],
                                        wdate: metadata.write_date,
                                    }));
                            });
                    } else {
                        self.print("No metadata available!");
                    }
                });
            }

            var defer = $.Deferred(function (d) {
                self.print("No metadata available!");
                d.resolve();
            });
            return $.when(defer);
        },

        _onClickTerminalView: function (ev) {
            if (Object.prototype.hasOwnProperty.call(ev.target.dataset,
                'resid') && Object.prototype.hasOwnProperty.call(
                ev.target.dataset, 'model')) {
                this._viewModelRecord([
                    ev.target.dataset.model,
                    ev.target.dataset.resid]);
            }
        },
    });

});
