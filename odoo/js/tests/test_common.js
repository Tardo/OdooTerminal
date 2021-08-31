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
            // Get the last res.currency id
            const def = this._super.apply(this, arguments);
            return def.then(() => {
                return rpc
                    .query({
                        method: "search_read",
                        domain: [],
                        fields: ["id"],
                        model: "res.currency",
                        limit: 1,
                        orderBy: "id DESC",
                        kwargs: {context: this.terminal._getContext()},
                    })
                    .then((result) => {
                        this._last_res_currency_id = result[0].id;
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
                        domain: [["id", ">", this._last_res_currency_id]],
                        fields: ["id"],
                        model: "res.currency",
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
                            model: "res.currency",
                            args: [ids],
                            kwargs: {context: this.terminal._getContext()},
                        });
                    });
            });
        },

        onBeforeTest: async function (test_name) {
            const def = this._super.apply(this, arguments);
            def.then(() => {
                if (
                    test_name === "test_context" ||
                    test_name === "test_context_no_arg"
                ) {
                    return this.terminal
                        .executeCommand("context", false, true)
                        .then((context) => {
                            this._orig_context = context;
                        });
                }
            });
            return def;
        },

        onAfterTest: async function (test_name) {
            const def = this._super.apply(this, arguments);
            def.then(() => {
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
                }
            });
            return def;
        },

        test_create: async function () {
            await this.terminal.executeCommand(
                "create -m res.currency",
                false,
                true
            );
            this.assertTrue(this.isFormOpen());
            const record_id = await this.terminal.executeCommand(
                `create -m res.currency -v \"{'name': 'T01', 'symbol': '%'}\"`,
                false,
                true
            );
            this.assertTrue(record_id > 0);
        },
        test_create__no_arg: async function () {
            await this.terminal.executeCommand(
                "create res.currency",
                false,
                true
            );
            this.assertTrue(this.isFormOpen());
            const record_id = await this.terminal.executeCommand(
                `create res.currency \"{'name': 'T02', 'symbol': '%'}\"`,
                false,
                true
            );
            this.assertTrue(record_id > 0);
        },

        test_unlink: async function () {
            const record_id = await this.terminal.executeCommand(
                `create -m res.currency -v \"{'name': 'T03', 'symbol': '%'}\"`,
                false,
                true
            );
            const res = await this.terminal.executeCommand(
                `unlink -m res.currency -i ${record_id}`,
                false,
                true
            );
            this.assertTrue(res);
        },
        test_unlink__no_arg: async function () {
            const record_id = await this.terminal.executeCommand(
                `create res.currency \"{'name': 'T04', 'symbol': '%'}\"`,
                false,
                true
            );
            const res = await this.terminal.executeCommand(
                `unlink res.currency ${record_id}`,
                false,
                true
            );
            this.assertTrue(res);
        },

        test_write: async function () {
            const record_a_id = await this.terminal.executeCommand(
                `create -m res.currency -v \"{'name': 'T05', 'symbol': '%'}\"`,
                false,
                true
            );
            const record_b_id = await this.terminal.executeCommand(
                `create -m res.currency -v \"{'name': 'T06', 'symbol': '%'}\"`,
                false,
                true
            );
            let res = await this.terminal.executeCommand(
                `write -m res.currency -i ${record_b_id} -v "{'symbol': '¡'}"`,
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                `write -m res.currency -i "${record_a_id}, ${record_b_id}" -v "{'symbol': '='}"`,
                false,
                true
            );
            this.assertTrue(res);
        },
        test_write__no_arg: async function () {
            const record_a_id = await this.terminal.executeCommand(
                `create -m res.currency -v \"{'name': 'T07', 'symbol': '%'}\"`,
                false,
                true
            );
            const record_b_id = await this.terminal.executeCommand(
                `create res.currency \"{'name': 'T08', 'symbol': '%'}\"`,
                false,
                true
            );
            let res = await this.terminal.executeCommand(
                `write res.currency ${record_b_id} "{'symbol': '¡'}"`,
                false,
                true
            );
            this.assertTrue(res);
            res = await this.terminal.executeCommand(
                `write res.currency "${record_a_id}, ${record_b_id}" "{'symbol': '!'}"`,
                false,
                true
            );
            this.assertTrue(res);
        },

        test_search: async function () {
            const res = await this.terminal.executeCommand(
                "search -m res.currency -f symbol -d \"[['id', '>', 1]]\" -l 3 -of 2 -o \"id desc\"",
                false,
                true
            );
            this.assertEqual(res.length, 3);
        },
        test_search__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "search res.currency symbol \"[['id', '>', 1]]\" 4 2 \"id desc\"",
                false,
                true
            );
            this.assertEqual(res.length, 4);
        },

        test_call: async function () {
            const res = await this.terminal.executeCommand(
                "call -m res.partner -c can_edit_vat -a [1]",
                false,
                true
            );
            this.assertTrue(res);
        },
        test_call__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "call res.partner can_edit_vat [1]",
                false,
                true
            );
            this.assertTrue(res);
        },

        test_upgrade: async function () {
            const res = await this.terminal.executeCommand(
                "upgrade -m mail_bot",
                false,
                true
            );
            this.assertEqual(res[0].name, "mail_bot");
        },
        test_upgrade__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "upgrade mail_bot",
                false,
                true
            );
            this.assertEqual(res[0].name, "mail_bot");
        },

        test_install: async function () {
            const res = await this.terminal.executeCommand(
                "install -m contacts",
                false,
                true
            );
            await Utils.asyncSleep(3000);
            this.assertEqual(res[0].name, "contacts");
            await this.terminal.executeCommand(
                "uninstall -m contacts",
                false,
                true
            );
            await Utils.asyncSleep(3000);
        },
        test_install__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "install contacts",
                false,
                true
            );
            await Utils.asyncSleep(3000);
            this.assertEqual(res[0].name, "contacts");
            await this.terminal.executeCommand(
                "uninstall contacts",
                false,
                true
            );
            await Utils.asyncSleep(3000);
        },

        test_uninstall: async function () {
            await this.terminal.executeCommand(
                "install -m contacts",
                false,
                true
            );
            await Utils.asyncSleep(3000);
            const res = await this.terminal.executeCommand(
                "uninstall -m contacts",
                false,
                true
            );
            this.assertEqual(res[0].name, "contacts");
            await Utils.asyncSleep(3000);
        },
        test_uninstall__no_arg: async function () {
            await this.terminal.executeCommand("install contacts", false, true);
            await Utils.asyncSleep(3000);
            const res = await this.terminal.executeCommand(
                "uninstall contacts",
                false,
                true
            );
            this.assertEqual(res[0].name, "contacts");
            await Utils.asyncSleep(3000);
        },

        test_action: async function () {
            let res = await this.terminal.executeCommand(
                "action -a 5",
                false,
                true
            );
            this.assertEqual(res.id, 5);
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
        },
        test_action__no_arg: async function () {
            let res = await this.terminal.executeCommand(
                "action 5",
                false,
                true
            );
            this.assertEqual(res.id, 5);
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
        },

        test_whoami: async function () {
            const res = await this.terminal.executeCommand(
                "whoami",
                false,
                true
            );
            this.assertEqual(res[0].login, "admin");
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
            this.assertEqual(res[0].id, 1);
            this.assertNotEmpty(res[0].symbol);
            this.assertEmpty(res[0].display_name);
        },
        test_read__no_arg: async function () {
            const res = await this.terminal.executeCommand(
                "read res.currency 1 symbol",
                false,
                true
            );
            this.assertEqual(res[0].id, 1);
            this.assertNotEmpty(res[0].symbol);
            this.assertEmpty(res[0].display_name);
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
        },
        test_context__no_arg: async function () {
            let res = await this.terminal.executeCommand(
                "context read",
                false,
                true
            );
            this.assertIn(res, "uid");
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
            return res[0].login === login;
        },

        test_login: async function () {
            // Get active database
            // FIXME: This type of calls are ugly, maybe some day
            // can scan the dependencies.
            let res = await this.terminal.executeCommand(
                "dblist --only-active",
                false,
                true
            );
            const dbname = res;
            res = await this.terminal.executeCommand(
                `login -d ${dbname} -u demo -p demo`,
                false,
                true
            );
            this.assertTrue(res);
            this.assertTrue(this._isLogin("demo"));
            res = await this.terminal.executeCommand(
                `login -d ${dbname} -u #admin`,
                false,
                true
            );
            this.assertTrue(res);
            this.assertTrue(this._isLogin("admin"));
        },
        test_login__no_arg: async function () {
            // Get active database
            // FIXME: This type of calls are ugly, maybe some day
            // can scan the dependencies.
            let res = await this.terminal.executeCommand(
                "dblist --only-active",
                false,
                true
            );
            const dbname = res;
            res = await this.terminal.executeCommand(
                `login ${dbname} demo demo`,
                false,
                true
            );
            this.assertTrue(res);
            this.assertTrue(this._isLogin("demo"));
            res = await this.terminal.executeCommand(
                `login ${dbname} #admin`,
                false,
                true
            );
            this.assertTrue(res);
            this.assertTrue(this._isLogin("admin"));
        },

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
    });
});
