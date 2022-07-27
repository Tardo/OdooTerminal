// Copyright 2021 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.tests.common", function (require) {
    "use strict";

    const TerminalTestSuite = require("terminal.tests");
    const Utils = require("terminal.core.Utils");
    const rpc = require("terminal.core.rpc");

    TerminalTestSuite.include({
        // Can't test 'lang'
        // Can't test 'reload'
        // Can't test 'debug'
        // Can't test 'post': No endpoint to test
        // Can't test 'jstest'
        // Can't test 'logout'

        onStartTests: function () {
            // Get the last res.partner.industry id
            const def = this._super.apply(this, arguments);
            return def.then(() => {
                return rpc
                    .query({
                        method: "search_read",
                        domain: [],
                        fields: ["id"],
                        model: "res.partner.industry",
                        limit: 1,
                        orderBy: "id DESC",
                        kwargs: {context: this.terminal._getContext()},
                    })
                    .then((result) => {
                        this._last_res_id = result[0].id;
                        return result;
                    });
            });
        },
        onEndTests: function () {
            // Delete all records used in tests
            const def = this._super.apply(this, arguments);
            return def.then(() => {
                return rpc
                    .query({
                        method: "search_read",
                        domain: [["id", ">", this._last_res_id]],
                        fields: ["id"],
                        model: "res.partner.industry",
                        orderBy: "id DESC",
                        kwargs: {context: this.terminal._getContext()},
                    })
                    .then((result) => {
                        const ids = _.map(result, "id");
                        if (_.isEmpty(result)) {
                            return result;
                        }
                        return rpc.query({
                            method: "unlink",
                            model: "res.partner.industry",
                            args: [ids],
                            kwargs: {context: this.terminal._getContext()},
                        });
                    });
            });
        },

        onBeforeTest: function (test_name) {
            const def = this._super.apply(this, arguments);
            return def.then(() => {
                if (
                    test_name === "test_context" ||
                    test_name === "test_context_no_arg"
                ) {
                    return this.terminal
                        .executeCommand("context", false, true)
                        .then((context) => {
                            this._orig_context = context;
                        });
                } else if (
                    test_name === "test_upgrade" ||
                    test_name === "test_upgrade__no_arg" ||
                    test_name === "test_uninstall" ||
                    test_name === "test_uninstall__no_arg"
                ) {
                    return this.terminal.executeCommand(
                        "install -m sms",
                        false,
                        true
                    );
                }
            });
        },

        onAfterTest: function (test_name) {
            const def = this._super.apply(this, arguments);
            return def.then(() => {
                if (
                    test_name === "test_context" ||
                    test_name === "test_context_no_arg"
                ) {
                    return this.terminal.executeCommand(
                        `context -o set -v '${JSON.stringify(
                            this._orig_context
                        )}'`,
                        false,
                        true
                    );
                } else if (
                    test_name === "test_upgrade" ||
                    test_name === "test_upgrade__no_arg"
                ) {
                    return this.terminal.executeCommand(
                        "uninstall -m sms --force",
                        false,
                        true
                    );
                }
            });
        },

        test_create: async function () {
            await this.terminal.executeCommand(
                "create -m res.partner",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 800));
            this.assertTrue(this.isFormOpen());
            const record_id = await this.terminal.executeCommand(
                `create -m res.partner -v "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            this.assertTrue(record_id > 0);
        },
        test_create__no_arg: async function () {
            await this.terminal.executeCommand(
                "create res.partner",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 800));
            this.assertTrue(this.isFormOpen());
            const record_id = await this.terminal.executeCommand(
                `create res.partner "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            this.assertTrue(record_id > 0);
        },

        test_unlink: async function () {
            const record_id = await this.terminal.executeCommand(
                `create -m res.partner -v "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            const res = await this.terminal.executeCommand(
                `unlink -m res.partner -i ${record_id}`,
                false,
                true
            );
            this.assertTrue(res);
        },
        test_unlink__no_arg: async function () {
            const record_id = await this.terminal.executeCommand(
                `create res.partner "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            const res = await this.terminal.executeCommand(
                `unlink res.partner ${record_id}`,
                false,
                true
            );
            this.assertTrue(res);
        },

        test_write: async function () {
            const record_a_id = await this.terminal.executeCommand(
                `create -m res.partner -v "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            const record_b_id = await this.terminal.executeCommand(
                `create -m res.partner -v "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            let res = await this.terminal.executeCommand(
                `write -m res.partner -i ${record_b_id} -v "{'name': '${_.uniqueId(
                    "Other name Test #"
                )}'}"`,
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                `write -m res.partner -i "${record_a_id}, ${record_b_id}" -v "{'name': '${_.uniqueId(
                    "Other name Test #"
                )}'}"`,
                false,
                true
            );
            this.assertTrue(res);
        },
        test_write__no_arg: async function () {
            const record_a_id = await this.terminal.executeCommand(
                `create -m res.partner -v "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            const record_b_id = await this.terminal.executeCommand(
                `create res.partner "{'name': '${_.uniqueId(
                    "This is a Test #"
                )}'}"`,
                false,
                true
            );
            let res = await this.terminal.executeCommand(
                `write res.partner ${record_b_id} "{'name': '${_.uniqueId(
                    "Other name Test #"
                )}'}"`,
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                `write res.partner "${record_a_id}, ${record_b_id}" "{'name': '${_.uniqueId(
                    "Other name Test #"
                )}'}"`,
                false,
                true
            );
            this.assertTrue(res);
        },

        test_search: async function () {
            const res = await this.terminal.executeCommand(
                "search -m res.partner -f name -d \"[['id', '>', 1]]\" -l 3 -of 2 -o \"id desc\"",
                false,
                true
            );
            this.assertEqual(res.length, 3);
        },
        test_search__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "search res.partner name \"[['id', '>', 1]]\" 4 2 \"id desc\"",
                false,
                true
            );
            this.assertEqual(res.length, 4);
        },

        test_call: async function () {
            const res = await this.terminal.executeCommand(
                "call -m res.partner -c address_get -a [1]",
                false,
                true
            );
            this.assertNotEmpty(res);
        },
        test_call__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "call res.partner address_get [1]",
                false,
                true
            );
            this.assertNotEmpty(res);
        },

        test_upgrade: async function () {
            await Utils.asyncSleep(6000);
            const res = await this.terminal.executeCommand(
                "upgrade -m sms",
                false,
                true
            );
            this.assertEqual(res?.name, "sms");
            await Utils.asyncSleep(6000);
        },
        test_upgrade__no_arg: async function () {
            await Utils.asyncSleep(6000);
            const res = await this.terminal.executeCommand(
                "upgrade sms",
                false,
                true
            );
            await Utils.asyncSleep(6000);
            this.assertEqual(res?.name, "sms");
        },

        test_install: async function () {
            await Utils.asyncSleep(6000);
            const res = await this.terminal.executeCommand(
                "install -m sms",
                false,
                true
            );
            await Utils.asyncSleep(6000);
            this.assertEqual(res?.name, "sms");
        },
        test_install__no_arg: async function () {
            await Utils.asyncSleep(6000);
            const res = await this.terminal.executeCommand(
                "install sms",
                false,
                true
            );
            await Utils.asyncSleep(6000);
            this.assertEqual(res?.name, "sms");
        },

        test_uninstall: async function () {
            await Utils.asyncSleep(6000);
            const res = await this.terminal.executeCommand(
                "uninstall -m sms --force",
                false,
                true
            );
            await Utils.asyncSleep(6000);
            this.assertEqual(res?.name, "sms");
        },
        test_uninstall__no_arg: async function () {
            await Utils.asyncSleep(6000);
            const res = await this.terminal.executeCommand(
                "uninstall sms --force",
                false,
                true
            );
            await Utils.asyncSleep(6000);
            this.assertEqual(res?.name, "sms");
        },

        test_action: async function () {
            let res = await this.terminal.executeCommand(
                "action -a 5",
                false,
                true
            );
            this.assertEqual(res.id, 5);
            if (this.terminal._mode === this.terminal.MODES.BACKEND_NEW) {
                res = await this.terminal.executeCommand(
                    "action -a base.action_res_company_form",
                    false,
                    true
                );
                this.assertEqual(res.id, "base.action_res_company_form");
                res = await this.terminal.executeCommand(
                    "action -a \"{'type': 'ir.actions.act_window', 'res_model': 'res.currency', 'view_type': 'form', 'view_mode': 'form', 'views': [[false, 'form']], 'target': 'current', 'res_id': 1}\"",
                    false,
                    true
                );
                this.assertNotEmpty(res);
            } else {
                res = await this.terminal.executeCommand(
                    "action -a base.action_res_company_form",
                    false,
                    true
                );
                this.assertEqual(res.xml_id, "base.action_res_company_form");
                res = await this.terminal.executeCommand(
                    "action -a \"{'type': 'ir.actions.act_window', 'res_model': 'res.currency', 'view_type': 'form', 'view_mode': 'form', 'views': [[false, 'form']], 'target': 'current', 'res_id': 1}\"",
                    false,
                    true
                );
                this.assertEqual(res.res_model, "res.currency");
                this.assertEqual(res.res_id, 1);
            }
        },
        test_action__no_arg: async function () {
            let res = await this.terminal.executeCommand(
                "action 5",
                false,
                true
            );
            this.assertEqual(res.id, 5);
            if (this.terminal._mode === this.terminal.MODES.BACKEND_NEW) {
                res = await this.terminal.executeCommand(
                    "action base.action_res_company_form",
                    false,
                    true
                );
                this.assertEqual(res.id, "base.action_res_company_form");
                res = await this.terminal.executeCommand(
                    "action \"{'type': 'ir.actions.act_window', 'res_model': 'res.currency', 'view_type': 'form', 'view_mode': 'form', 'views': [[false, 'form']], 'target': 'current', 'res_id': 1}\"",
                    false,
                    true
                );
                this.assertNotEmpty(res);
            } else {
                res = await this.terminal.executeCommand(
                    "action base.action_res_company_form",
                    false,
                    true
                );
                this.assertEqual(res.xml_id, "base.action_res_company_form");
                res = await this.terminal.executeCommand(
                    "action \"{'type': 'ir.actions.act_window', 'res_model': 'res.currency', 'view_type': 'form', 'view_mode': 'form', 'views': [[false, 'form']], 'target': 'current', 'res_id': 1}\"",
                    false,
                    true
                );
                this.assertEqual(res.res_model, "res.currency");
                this.assertEqual(res.res_id, 1);
            }
        },

        test_whoami: async function () {
            const res = await this.terminal.executeCommand(
                "whoami",
                false,
                true
            );
            this.assertEqual(res?.login, "admin");
        },

        test_caf: async function () {
            const res = await this.terminal.executeCommand(
                "caf -m res.currency -f symbol -fi \"{'required': true}\"",
                false,
                true
            );
            this.assertNotEmpty(res.symbol);
            this.assertEmpty(res.id);
        },
        test_caf__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "caf res.currency symbol \"{'required': true}\"",
                false,
                true
            );
            this.assertNotEmpty(res.symbol);
            this.assertEmpty(res.id);
        },

        test_cam: async function () {
            let res = await this.terminal.executeCommand(
                "cam -m res.currency -o create",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "cam -m res.currency -o unlink",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "cam -m res.currency -o write",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "cam -m res.currency -o read",
                false,
                true
            );
            this.assertTrue(res);
        },
        test_cam__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "cam res.currency create",
                false,
                true
            );
            this.assertTrue(res);
        },

        test_lastseen: async function () {
            // Only test that can be called
            await this.terminal.executeCommand("lastseen", false, true);
        },

        test_read: async function () {
            const res = await this.terminal.executeCommand(
                "read -m res.currency -i 1 -f symbol",
                false,
                true
            );
            this.assertEqual(res[0]?.id, 1);
            this.assertNotEmpty(res[0]?.symbol);
            this.assertEmpty(res[0]?.display_name);
        },
        test_read__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "read res.currency 1 symbol",
                false,
                true
            );
            this.assertEqual(res[0]?.id, 1);
            this.assertNotEmpty(res[0]?.symbol);
            this.assertEmpty(res[0]?.display_name);
        },

        test_context: async function () {
            let res = await this.terminal.executeCommand(
                "context",
                false,
                true
            );
            this.assertIn(res, "uid");
            res = await this.terminal.executeCommand(
                "context -o read",
                false,
                true
            );
            this.assertIn(res, "uid");
            // At the moment operations with the context are not possible in legacy mode
            if (this.terminal._mode !== this.terminal.MODES.BACKEND_NEW) {
                res = await this.terminal.executeCommand(
                    "context -o write -v \"{'test_key': 'test_value'}\"",
                    false,
                    true
                );
                this.assertIn(res, "test_key");
                res = await this.terminal.executeCommand(
                    "context -o set -v \"{'test_key': 'test_value_change'}\"",
                    false,
                    true
                );
                this.assertEqual(res.test_key, "test_value_change");
                res = await this.terminal.executeCommand(
                    "context -o delete -v test_key",
                    false,
                    true
                );
                this.assertNotIn(res, "test_key");
            }
        },
        test_context__no_arg: async function () {
            let res = await this.terminal.executeCommand(
                "context read",
                false,
                true
            );
            this.assertIn(res, "uid");
            // At the moment operations with the context are not possible in legacy mode
            if (this.terminal._mode !== this.terminal.MODES.BACKEND_NEW) {
                res = await this.terminal.executeCommand(
                    "context write \"{'test_key': 'test_value'}\"",
                    false,
                    true
                );
                this.assertIn(res, "test_key");
                res = await this.terminal.executeCommand(
                    "context set \"{'test_key': 'test_value_change'}\"",
                    false,
                    true
                );
                this.assertEqual(res.test_key, "test_value_change");
                res = await this.terminal.executeCommand(
                    "context delete test_key",
                    false,
                    true
                );
                this.assertNotIn(res, "test_key");
            }
        },

        test_version: async function () {
            const res = await this.terminal.executeCommand(
                "version",
                false,
                true
            );
            this.assertTrue(res);
        },

        test_longpolling: async function () {
            let res = await this.terminal.executeCommand(
                "longpolling -o verbose",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling -o off",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling -o add_channel -p test_channel",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling -o del_channel -p test_channel",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling -o stop",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling -o start",
                false,
                true
            );
            this.assertTrue(res);
        },
        test_longpolling__no_arg: async function () {
            let res = await this.terminal.executeCommand(
                "longpolling verbose",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling off",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling add_channel test_channel",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling del_channel test_channel",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling stop",
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                "longpolling start",
                false,
                true
            );
            this.assertTrue(res);
        },

        _isLogin: async function (login) {
            const res = await this.terminal.executeCommand(
                "whoami",
                false,
                true
            );
            return res?.login === login;
        },

        // FIXME: login tests cause problems on new Odoo versions
        // test_login: async function () {
        //     // Get active database
        //     // FIXME: This type of calls are ugly, maybe some day
        //     // can scan the dependencies.
        //     let res = await this.terminal.executeCommand(
        //         "dblist --only-active",
        //         false,
        //         true
        //     );
        //     const dbname = res;
        //     res = await this.terminal.executeCommand(
        //         `login -d ${dbname} -u demo -p demo --no-reload`,
        //         false,
        //         true
        //     );
        //     this.assertTrue(res);
        //     this.assertTrue(await this._isLogin("demo"));
        //     res = await this.terminal.executeCommand(
        //         `login -d ${dbname} -u #admin --no-reload`,
        //         false,
        //         true
        //     );
        //     this.assertTrue(res);
        //     this.assertTrue(await this._isLogin("admin"));
        // },
        // test_login__no_arg: async function () {
        //     // Get active database
        //     // FIXME: This type of calls are ugly, maybe some day
        //     // can scan the dependencies.
        //     let res = await this.terminal.executeCommand(
        //         "dblist --only-active",
        //         false,
        //         true
        //     );
        //     const dbname = res;
        //     res = await this.terminal.executeCommand(
        //         `login ${dbname} demo demo --no-reload`,
        //         false,
        //         true
        //     );
        //     this.assertTrue(res);
        //     this.assertTrue(await this._isLogin("demo"));
        //     res = await this.terminal.executeCommand(
        //         `login ${dbname} #admin --no-reload`,
        //         false,
        //         true
        //     );
        //     this.assertTrue(res);
        //     this.assertTrue(await this._isLogin("admin"));
        // },

        test_uhg: async function () {
            const res = await this.terminal.executeCommand(
                "uhg -g base.group_user",
                false,
                true
            );
            this.assertTrue(res);
        },
        test_uhg__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "uhg base.group_user",
                false,
                true
            );
            this.assertTrue(res);
        },

        test_dblist: async function () {
            let res = await this.terminal.executeCommand("dblist", false, true);
            this.assertNotEmpty(res);

            res = await this.terminal.executeCommand(
                "dblist --only-active",
                false,
                true
            );
            this.assertTrue(typeof res === "string");
        },

        test_tour: async function () {
            // This test is incomplete to avoid page reloads
            const res = await this.terminal.executeCommand("tour", false, true);
            this.assertNotEmpty(res);
        },

        test_json: async function () {
            const res = await this.terminal.executeCommand(
                "json -e /web_editor/get_assets_editor_resources -d \"{'key':'web.assets_backend'}\"",
                false,
                true
            );
            this.assertIn(res, "views");
        },
        test_json__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "json /web_editor/get_assets_editor_resources \"{'key':'web.assets_backend'}\"",
                false,
                true
            );
            this.assertIn(res, "views");
        },

        test_depends: async function () {
            const res = await this.terminal.executeCommand(
                "depends -m mail",
                false,
                true
            );
            this.assertNotEmpty(res);
        },
        test_depends__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "depends mail",
                false,
                true
            );
            this.assertNotEmpty(res);
        },

        test_ual: async function () {
            const res = await this.terminal.executeCommand("ual", false, true);
            this.assertTrue(res);
        },

        test_count: async function () {
            const res = await this.terminal.executeCommand(
                "count -m res.currency",
                false,
                true
            );
            this.assertTrue(res > 0);
            const resb = await this.terminal.executeCommand(
                "count -m res.currency -d \"[['symbol', '=', '$']]\"",
                false,
                true
            );
            this.assertTrue(resb < res);
        },
        test_count__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "count res.currency",
                false,
                true
            );
            this.assertTrue(res > 0);
            const resb = await this.terminal.executeCommand(
                "count res.currency \"[['symbol', '=', '$']]\"",
                false,
                true
            );
            this.assertTrue(resb < res);
        },

        test_ref: async function () {
            const res = await this.terminal.executeCommand(
                "ref -x base.main_company,base.model_res_partner",
                false,
                true
            );
            this.assertNotEmpty(res);
            this.assertEqual(res.length, 2);
        },
        test_ref__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "ref base.main_company,base.model_res_partner",
                false,
                true
            );
            this.assertNotEmpty(res);
            this.assertEqual(res.length, 2);
        },

        test_rpc: async function () {
            const res = await this.terminal.executeCommand(
                "rpc -o \"{'route': '/jsonrpc', 'method': 'server_version', 'params': {'service': 'db'}}\"",
                false,
                true
            );
            this.assertNotEmpty(res);
        },
        test_rpc__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "rpc \"{'route': '/jsonrpc', 'method': 'server_version', 'params': {'service': 'db'}}\"",
                false,
                true
            );
            this.assertNotEmpty(res);
        },

        test_metadata: async function () {
            const res = await this.terminal.executeCommand(
                "metadata -m res.partner -i 1",
                false,
                true
            );
            this.assertNotEmpty(res);
            this.assertEqual(res.xmlid, "base.main_partner");
        },
        test_metadata__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "metadata res.partner 1",
                false,
                true
            );
            this.assertNotEmpty(res);
            this.assertEqual(res.xmlid, "base.main_partner");
        },

        test_barcode: async function () {
            const res = await this.terminal.executeCommand(
                "barcode -o info",
                false,
                true
            );
            this.assertNotEmpty(res);
            await this.terminal.executeCommand(
                "view -m res.partner -i 1",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue($(".o_cp_buttons .o_form_button_edit").length > 0);
            await this.terminal.executeCommand(
                "barcode -o send -d O-CMD.EDIT",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue($(".o_cp_buttons .o_form_button_save").length > 0);
            await this.terminal.executeCommand(
                "barcode -o send -d O-CMD.DISCARD,O-CMD.EDIT,O-CMD.DISCARD",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue($(".o_cp_buttons .o_form_button_edit").length > 0);
        },
        test_barcode__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "barcode info",
                false,
                true
            );
            this.assertNotEmpty(res);
            await this.terminal.executeCommand(
                "view res.partner 1",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue($(".o_cp_buttons .o_form_button_edit").length > 0);
            await this.terminal.executeCommand(
                "barcode send O-CMD.EDIT",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue($(".o_cp_buttons .o_form_button_save").length > 0);
            await this.terminal.executeCommand(
                "barcode send O-CMD.DISCARD,O-CMD.EDIT,O-CMD.DISCARD",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue($(".o_cp_buttons .o_form_button_edit").length > 0);
        },
    });
});
