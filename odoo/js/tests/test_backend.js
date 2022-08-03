// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.tests.backend", function (require) {
    "use strict";

    const TerminalTestSuite = require("terminal.tests");
    const Utils = require("terminal.core.Utils");

    TerminalTestSuite.include({
        test_view: async function () {
            await this.terminal.executeCommand(
                "view -m res.partner",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            const $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "list"));
            this.closeModal($modal);
            await this.terminal.executeCommand(
                "view -m res.partner -i 1",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue(this.isFormOpen());
            await this.terminal.executeCommand(
                "view -m res.partner -i 1 -r base.view_partner_simple_form",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue(this.isFormOpen());
        },
        test_view__no_arg: async function () {
            await this.terminal.executeCommand("view res.partner", false, true);
            await new Promise((resolve) => setTimeout(resolve, 2500));
            const $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "list"));
            this.closeModal($modal);
            await this.terminal.executeCommand(
                "view res.partner 1",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue(this.isFormOpen());
            await this.terminal.executeCommand(
                "view res.partner 1 base.view_partner_simple_form",
                false,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, 2500));
            this.assertTrue(this.isFormOpen());
        },

        test_settings: async function () {
            await this.terminal.executeCommand("settings", false, true);
            await Utils.asyncSleep(2000);
            this.assertTrue(
                $(".o_form_view .settings, .o_form_view > .settings").length > 0
            );
        },
    });
});
