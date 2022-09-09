// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.tests.core", function (require) {
    "use strict";

    const TerminalTestSuite = require("terminal.tests");

    TerminalTestSuite.include({
        // Can't test 'exportfile' because required user interaction

        onBeforeTest: async function (test_name) {
            const def = this._super.apply(this, arguments);
            def.then(() => {
                if (test_name === "test_context_term") {
                    return this.terminal
                        .execute("context_term", false, true)
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
                if (test_name === "test_context_term") {
                    return this.terminal.execute(
                        `context_term -o set -v '${JSON.stringify(
                            this._orig_context
                        )}'`,
                        false,
                        true
                    );
                }
            });
            return def;
        },

        test_call_not_named_args: async function () {
            let res = await this.terminal.execute(
                "alias test \"print -m 'This is a test! $1 ($2[Nothing])'\"",
                false,
                true
            );
            this.assertIn(res, "test");
            res = await this.terminal.execute(
                "alias testB -c \"print -m 'This is a test! $1 ($2[Nothing])'\"",
                false,
                true
            );
            this.assertIn(res, "testB");
        },

        test_help: async function () {
            await this.terminal.execute("help", false, true);
            await this.terminal.execute("help -c search", false, true);
            await this.terminal.execute("help search", false, true);
        },

        test_print: async function () {
            const res = await this.terminal.execute(
                "print -m 'This is a test!'",
                false,
                true
            );
            this.assertEqual(res, "This is a test!");
        },

        test_load: async function () {
            const res = await this.terminal.execute(
                "load -u https://cdnjs.cloudflare.com/ajax/libs/Mock.js/1.0.0/mock-min.js",
                false,
                true
            );
            this.assertTrue(res);
        },

        test_context_term: async function () {
            let res = await this.terminal.execute("context_term", false, true);
            this.assertIn(res, "active_test");
            res = await this.terminal.execute(
                "context_term -o read",
                false,
                true
            );
            this.assertIn(res, "active_test");
            res = await this.terminal.execute(
                "context_term -o write -v {test_key: 'test_value'}",
                false,
                true
            );
            this.assertIn(res, "test_key");
            res = await this.terminal.execute(
                "context_term -o set -v {test_key: 'test_value_change'}",
                false,
                true
            );
            this.assertEqual(res.test_key, "test_value_change");
            res = await this.terminal.execute(
                "context_term -o delete -v test_key",
                false,
                true
            );
            this.assertNotIn(res, "test_key");
        },

        test_alias: async function () {
            let res = await this.terminal.execute("alias", false, true);
            // This.assertEmpty(res);
            res = await this.terminal.execute(
                "alias -n test -c \"print -m 'This is a test! $1 ($2[Nothing])'\"",
                false,
                true
            );
            this.assertIn(res, "test");
            res = await this.terminal.execute(
                'test Foo "Bar Space"',
                false,
                true
            );
            this.assertEqual(res, "This is a test! Foo (Bar Space)");
            res = await this.terminal.execute("test Foo", false, true);
            this.assertEqual(res, "This is a test! Foo (Nothing)");
            res = await this.terminal.execute("alias -n test", false, true);
            this.assertNotIn(res, "test");
        },

        test_quit: async function () {
            await this.terminal.execute("quit", false, true);
            this.assertFalse(
                this.terminal.$el.hasClass("terminal-transition-topdown")
            );
        },

        test_exportvar: async function () {
            const res = await this.terminal.execute(
                "exportvar -v $(print 'This is a test')",
                false,
                true
            );
            this.assertTrue(Object.hasOwn(window, res[1]));
            this.assertEqual(window[res[1]], "This is a test");
        },

        test_chrono: async function () {
            const res = await this.terminal.execute(
                "chrono -c \"print -m 'This is a test'\"",
                false,
                true
            );
            this.assertNotEqual(res, -1);
        },

        test_repeat: async function () {
            const res = await this.terminal.execute(
                "repeat -t 500 -c \"print -m 'This is a test'\" --silent",
                false,
                true
            );
            this.assertNotEqual(res, -1);
        },

        test_jobs: async function () {
            const res = await this.terminal.execute("jobs", false, true);
            this.assertEqual(res[0]?.cmdInfo.cmdName, "jobs");
        },
    });
});
