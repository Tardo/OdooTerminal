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
                args: "si?s",
            });
        },

        _cmdMyFunc: function(pA, pB, pC = "DefaultValue") {
            var self = this;

            var defer = $.Deferred(function(d) {
                self.print("Hello, World!");
                self.eprint("ParamA (String): " + pA);
                self.eprint("ParamB (Int): " + pB);
                self.eprint("ParamC (Optional String): " + pC);

                if (Number(pA) === pB) {
                    d.resolve();
                } else {
                    d.reject("Oops! error");
                }
            });

            return $.when(defer);
        },
    });
});
