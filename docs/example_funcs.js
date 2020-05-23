odoo.define("terminal.MyFuncs", function(require) {
    "use strict";

    var Terminal = require("terminal.Terminal").terminal;

    Terminal.include({
        init: function() {
            this._super.apply(this, arguments);

            this.registerCommand("mycommand", {
                definition: "This is my command",
                function: this._cmdMyFunc,
                detail: "My command explained...",
                syntaxis: "<STRING: ParamA> <INT: ParamB> [STRING: ParamC]",
                args: "si?si",
            });
        },

        _cmdMyFunc: async function(pA, pB, pC = "DefaultValue", pD = -1) {
            var self = this;

            self.print("Hello, World!");
            self.eprint("ParamA (String): " + pA);
            self.eprint("ParamB (Int): " + pB);
            self.eprint("ParamC (Optional String): " + pC);
            self.eprint("ParamD (Optional Int): " + pD);

            if (pB instanceof Number) {
                this.print("pB is a Number!");
            }

            if (pA !== pC) {
                this.printError("Invalid! pA need be the same as pC");
            }

            return true;
        },
    });
});
