odoo.define("terminal.MyFuncs", function (require) {
    "use strict";

    const Terminal = require("terminal.Terminal").terminal;

    Terminal.include({
        /**
         * @override
         */
        init: function () {
            this._super.apply(this, arguments);

            this.registerCommand("mycommand", {
                definition: "This is my command",
                function: this._cmdMyFunc,
                detail: "My command explained...",
                syntax:
                    "<STRING: ParamA> <INT: ParamB> [STRING: ParamC] [INT: ParamD]",
                args: "si?si",
            });

            this.registerCommand("myasynccommand", {
                definition: "This is my async command",
                function: this._cmdMyAsyncFunc,
                detail: "My async command explained...",
                syntax: "<INT: ParamA> <INT: ParamB>",
                args: "si",
            });
        },

        /**
         * Basic implementation example for the 'mycommand' command
         *
         * @param {String} param_a
         * @param {Int} param_b
         * @param {String} param_c
         * @param {Int} param_d
         * @returns {Promise}
         */
        _cmdMyFunc: function (
            param_a,
            param_b,
            param_c = "DefaultValue",
            param_d = -1
        ) {
            this.screen.print("Hello, World!");
            this.screen.eprint("ParamA (String): " + param_a);
            this.screen.eprint("ParamB (Int): " + param_b);
            this.screen.eprint("ParamC (Optional String): " + param_c);
            this.screen.eprint("ParamD (Optional Int): " + param_d);

            if (param_b instanceof Number) {
                this.screen.print("ParamB is a Number!");
            }

            if (param_a !== param_c) {
                this.screen.printError(
                    "Invalid! ParamA need be the same as ParamC"
                );
            }

            return Promise.resolve();
        },

        /**
         * Async/await workaround example
         * This is necessary to don't brake the inheritance chain.
         * This results in two promises, one awaitable and other
         * wrapping them. So for this reason you must use 'return' to
         * finalize the awaitable promise and propagate the results.
         *
         * @param {Int} param_a
         * @param {Int} param_b
         * @returns {Promise}
         */
        _cmdMyAsyncFunc: function (param_a, param_b) {
            return new Promise(async (resolve, reject) => {
                const result = await Promise.resolve(param_a);
                const other_result = await Promise.resolve(param_b);

                if (result !== other_result) {
                    return reject("Something is wrong!");
                }

                return resolve();
            });
        },
    });
});
