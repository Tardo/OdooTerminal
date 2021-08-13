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
                args: [
                    "s::pa:parama::1::The Param A",
                    "i::pb:paramb::1::The Param B",
                    "s::pc:paramc::0::The Param C::DefaultValue",
                    "i::pd:paramd::0::The Param D::-1",
                ],
            });

            this.registerCommand("myasynccommand", {
                definition: "This is my async command",
                function: this._cmdMyAsyncFunc,
                detail: "My async command explained...",
                args: [
                    "s::pa:parama::1::The Param A",
                    "i::pb:paramb::1::The Param B",
                ],
            });
        },

        /**
         * Basic implementation example for the 'mycommand' command
         *
         * @param {Object} kwargs
         * @returns {Promise}
         */
        _cmdMyFunc: function (kwargs) {
            this.screen.print("Hello, World!");
            this.screen.eprint("ParamA (String): " + kwargs.parama);
            this.screen.eprint("ParamB (Int): " + kwargs.paramb);
            this.screen.eprint("ParamC (Optional String): " + kwargs.paramc);
            this.screen.eprint("ParamD (Optional Int): " + kwargs.paramd);

            if (kwargs.paramb instanceof Number) {
                this.screen.print("ParamB is a Number!");
            }

            if (kwargs.parama !== kwargs.paramc) {
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
         * @param {Object} kwargs
         * @returns {Promise}
         */
        _cmdMyAsyncFunc: function (kwargs) {
            return new Promise(async (resolve, reject) => {
                const result = await Promise.resolve(kwargs.parama);
                const other_result = await Promise.resolve(kwargs.paramb);

                if (result !== other_result) {
                    return reject("Something is wrong!");
                }

                return resolve();
            });
        },
    });
});
