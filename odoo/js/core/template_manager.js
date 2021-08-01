// Copyright 2020 Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

/**
 * This file is 'only' for better readability of the source.
 */
odoo.define("terminal.core.TemplateManager", function (require) {
    "use strict";

    const Class = require("web.Class");

    const TemplateManager = Class.extend({
        TEMPLATES: {
            /* TERMINAL */
            ERROR_MESSAGE:
                "<div>" +
                "<h4><%= error_name %></h4>" +
                "<span><%= error_message %></span>" +
                "<ul>" +
                "<li name='exception_type'>" +
                "<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseExceptionType<%= error_id %>' role='button' aria-expanded='false' aria-controls='collapseExceptionType<%= error_id %>'>" +
                "Exception Type" +
                "</a>" +
                "<div class='collapse' id='collapseExceptionType<%= error_id %>'>" +
                "<div class='card card-body'><%= exception_type %></div>" +
                "</div>" +
                "</li>" +
                "<li name='context'>" +
                "<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseContext<%= error_id %>' role='button' aria-expanded='false' aria-controls='collapseContext<%= error_id %>'>" +
                "Context" +
                "</a>" +
                "<div class='collapse' id='collapseContext<%= error_id %>'>" +
                "<div class='card card-body'><%= context %></div>" +
                "</div>" +
                "</li>" +
                "<li name='args'>" +
                "<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseArguments<%= error_id %>' role='button' aria-expanded='false' aria-controls='collapseArguments<%= error_id %>'>" +
                "Arguments" +
                "</a>" +
                "<div class='collapse' id='collapseArguments<%= error_id %>'>" +
                "<div class='card card-body'><%= args %></div>" +
                "</div>" +
                "</li>" +
                "<li name='debug'>" +
                "<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseDebug<%= error_id %>' role='button' aria-expanded='false' aria-controls='collapseDebug<%= error_id %>'>" +
                "Debug" +
                "</a>" +
                "<div class='collapse' id='collapseDebug<%= error_id %>'>" +
                "<div class='card card-body'><%= debug %></div>" +
                "</div>" +
                "</li>" +
                "</ul>" +
                "</div>",
            TABLE:
                "<table class='print-table'>" +
                "<thead>" +
                "<tr>" +
                "<th><%= thead %></th>" +
                "</tr>" +
                "</thead>" +
                "<tbody>" +
                "<%= tbody %>" +
                "</tbody>" +
                "</table>",
            TABLE_SEARCH_ID:
                "<td><span class='o_terminal_click o_terminal_view' data-resid='<%= id %>' data-model='<%= model %>'>#<%= id %></span></td>",
            WHOAMI:
                "<span style='color: gray;'>Login</span>: <%= login %><br>" +
                "<span style='color: gray;'>User</span>: <%= display_name %> (#<%= user_id %>)<br>" +
                "<span style='color: gray;'>Partner</span>: <%= partner[1] %> (#<%= partner[0] %>)<br>" +
                "<span style='color: gray;'>Company</span>: <%= company[1] %> (#<%= company[0] %>)<br>" +
                "<span style='color: gray;'>In Companies (ids)</span>: <%= companies %><br>" +
                "<span style='color: gray;'>In Groups (ids)</span>: <%= groups %>",
            UNKNOWN_COMMAND: `Unknown command. Did you mean '<strong class='o_terminal_click o_terminal_cmd' data-cmd='<%= cmd %> <%= params %>'><%= cmd %></strong>'?`,
            PROMPT_CMD_HIDDEN_ARGS: `<%= prompt %> <%= cmd.split(" ")[0] %> *****`,
            PROMPT_CMD: `<%= prompt %> <%= cmd %>`,
            WELCOME: `<strong class='o_terminal_title'>Odoo Terminal v<%= ver %></strong>`,
            HELP_CMD: `<strong class='o_terminal_click o_terminal_cmd' data-cmd='help <%= cmd %>'><%= cmd %></strong> - <i><%= def %></i>`,
            RECORD_CREATED: `<%= model %> record created successfully: <span class='o_terminal_click o_terminal_view' data-resid='<%= new_id %>' data-model='<%= model %>'><%= new_id %></span>`,
            DEPRECATED_COMMAND: `** This command is deprecated, please use '<%= cmd %>' instead.`,
        },

        render: function (templateid, values) {
            return _.template(this.TEMPLATES[templateid])(values);
        },

        get: function (templateid) {
            return this.TEMPLATES[templateid];
        },
    });

    return TemplateManager;
});
