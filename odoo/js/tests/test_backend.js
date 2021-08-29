// Copyright 2021 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

odoo.define("terminal.tests.backend", function (require) {
    "use strict";

    const TerminalTestSuite = require("terminal.tests");

    TerminalTestSuite.include({
        test_view: async function () {
            await this.terminal.executeCommand(
                "view -m res.partner",
                false,
                true
            );
            let $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "list"));
            this.closeModal($modal);
            await this.terminal.executeCommand(
                "view -m res.partner -i 1",
                false,
                true
            );
            $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "form"));
            this.closeModal($modal);
            await this.terminal.executeCommand(
                "view -m res.partner -i 1 -r base.view_partner_simple_form",
                false,
                true
            );
            $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "form"));
            this.closeModal($modal);
        },
        test_view__no_arg: async function () {
            await this.terminal.executeCommand("view res.partner", false, true);
            let $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "list"));
            this.closeModal($modal);
            await this.terminal.executeCommand(
                "view res.partner 1",
                false,
                true
            );
            $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "form"));
            this.closeModal($modal);
            await this.terminal.executeCommand(
                "view res.partner 1 base.view_partner_simple_form",
                false,
                true
            );
            $modal = this.getModalOpen();
            this.assertTrue(this.isModalType($modal, "form"));
            this.closeModal($modal);
        },

        test_settings: async function () {
            await this.terminal.executeCommand("settings", false, true);
            this.assertTrue($(".o_form_view .settings").length > 0);
        },
    });
});
