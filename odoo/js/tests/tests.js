// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.tests", function (require) {
    "use strict";

    const Terminal = require("terminal.Terminal");
    const Class = require("web.Class");

    class TerminalTestValidationError extends Error {
        constructor(message) {
            super(message);
            this.name = "TERMINAL_TEST_VALIDATION_ERROR";
            this.message = message;
        }
    }

    const TerminalTestSuite = Class.extend({
        init: function (terminal) {
            this.terminal = terminal;
        },

        assertTrue: function (val, msg = "") {
            if (!val) {
                throw new TerminalTestValidationError(msg);
            }
        },
        assertFalse: function (val, msg = "") {
            if (val) {
                throw new TerminalTestValidationError(msg);
            }
        },
        assertEqual: function (valA, valB, msg = "") {
            if (valA !== valB) {
                throw new TerminalTestValidationError(msg);
            }
        },
        assertNotEqual: function (valA, valB, msg = "") {
            if (valA === valB) {
                throw new TerminalTestValidationError(msg);
            }
        },
        assertIn: function (obj, key, msg = "") {
            if (!Object.hasOwn(obj, key)) {
                throw new TerminalTestValidationError(msg);
            }
        },
        assertNotIn: function (obj, key, msg = "") {
            if (Object.hasOwn(obj, key)) {
                throw new TerminalTestValidationError(msg);
            }
        },
        assertEmpty: function (val, msg = "") {
            if (!_.isEmpty(val)) {
                throw new TerminalTestValidationError(msg);
            }
        },
        assertNotEmpty: function (val, msg = "") {
            if (_.isEmpty(val)) {
                throw new TerminalTestValidationError(msg);
            }
        },

        getModalOpen: function () {
            return $(".modal.show,.modal.in");
        },
        isModalType: function ($modal, type) {
            return $modal.find(`.o_${type}_view`).length > 0;
        },
        closeModal: function ($modal) {
            $modal.find(".close")[0].click();
        },

        isFormOpen: function () {
            return !_.isNull(
                document.querySelector(
                    ".o_view_controller .o_form_view,.o_view_manager_content .o_form_view"
                )
            );
        },

        onStartTests: function (test_names) {
            return Promise.resolve(test_names);
        },
        onBeforeTest: function (test_name) {
            this.terminal.doShow();
            return Promise.resolve(test_name);
        },
        onAfterTest: function (test_name) {
            return Promise.resolve(test_name);
        },
        onEndTests: function (test_names) {
            return Promise.resolve(test_names);
        },
    });

    Terminal.include({
        destroy: function () {
            this.$el[0].removeEventListener(
                "start_terminal_tests",
                this._onStartTests.bind(this)
            );
        },

        _createTerminal: function () {
            this._super.apply(this, arguments);
            this.$el[0].addEventListener(
                "start_terminal_tests",
                this._onStartTests.bind(this)
            );
        },

        _onStartTests: function (ev) {
            const test_names = _.compact((ev.detail || "").split(","));
            this.doShow().then(() => {
                this.screen.clean();
                this._runTests(test_names);
            });
        },

        _getTestMethods: function (obj) {
            const names = new Set();
            do {
                Object.getOwnPropertyNames(obj)
                    .filter(
                        (item) =>
                            item.startsWith("test_") &&
                            typeof obj[item] === "function"
                    )
                    .map((item) => names.add(item));
            } while ((obj = Object.getPrototypeOf(obj)));
            return [...names];
        },

        _runTests: function (test_names) {
            return new Promise(async (resolve, reject) => {
                const errors = {};
                const test_suit = new TerminalTestSuite(this);
                let names = this._getTestMethods(test_suit);
                if (!_.isEmpty(test_names)) {
                    names = _.intersection(names, test_names);
                }
                this.screen.print("[info] Running tests...");
                await test_suit.onStartTests(names);
                for (const name of names) {
                    this.screen.print(`${name}... `, true);
                    const _context = _.extend({}, test_suit);
                    await test_suit.onBeforeTest.call(_context, name);
                    try {
                        await test_suit[name].call(_context);
                        this.screen.print("OK");
                        // Ensure that the terminal remains open
                        this.doShow();
                    } catch (e) {
                        errors[name] = e;
                        this.screen.printError(e.stack);
                        this.screen.print("FAIL");
                    }
                    await test_suit.onAfterTest.call(_context, name);
                }
                await test_suit.onEndTests(names);
                this.screen.print("");
                if (Object.keys(errors).length > 0) {
                    this.screen.print(
                        "ERRORS. The following test failed:",
                        false,
                        "terminal-test-fail"
                    );
                    this.screen.print(Object.keys(errors));
                    return reject(errors);
                }
                this.screen.print(
                    "OK. All tests passed.",
                    false,
                    "terminal-test-ok"
                );
                return resolve();
            });
        },
    });

    return TerminalTestSuite;
});
