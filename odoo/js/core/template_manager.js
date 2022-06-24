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
                "<td><span class='o_terminal_click o_terminal_cmd' data-cmd='view <%= model %> <%= id %>'>#<%= id %></span></td>",
            WHOAMI:
                "<span style='color: gray;'>Login</span>: <%= login %><br>" +
                "<span style='color: gray;'>User</span>: <%= display_name %> (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.users <%= user_id %>'>#<%= user_id %></span>)<br>" +
                "<span style='color: gray;'>Partner</span>: <%= partner[1] %> (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.partner <%= partner[0] %>'>#<%= partner[0] %></span>)<br>" +
                "<span style='color: gray;'>Active Company</span>: <%= company[1] %> (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.company <%= company[0] %>'>#<%= company[0] %></span>)<br>" +
                "<span style='color: gray;'>In Companies</span>: <%= companies %><br>" +
                "<span style='color: gray;'>In Groups</span>: <%= groups %>",
            WHOAMI_LIST_ITEM:
                "<br>\u00A0\u00A0- <%= name %> (<span class='o_terminal_click o_terminal_cmd' data-cmd='view <%= model %> <%= id %>'>#<%= id %></span>)",
            UNKNOWN_COMMAND: `Unknown command. Did you mean '<strong class='o_terminal_click o_terminal_cmd' data-cmd='<%= cmd %> <%= params %>'><%= cmd %></strong>'?`,
            PROMPT_CMD_HIDDEN_ARGS: `<%= prompt %> <%= cmd.split(" ")[0] %> *****`,
            PROMPT_CMD: `<%= prompt %> <%= cmd %>`,
            WELCOME: `<strong class='o_terminal_title'>Odoo Terminal v<%= ver %></strong>`,
            HELP_CMD: `<strong class='o_terminal_click o_terminal_cmd' data-cmd='help <%= cmd %>'><%= cmd %></strong> - <i><%= def %></i>`,
            RECORD_CREATED: `<%= model %> record created successfully: <span class='o_terminal_click o_terminal_cmd' data-cmd='view <%= model %> <%= new_id %>'><%= new_id %></span>`,
            DEPRECATED_COMMAND: `** This command is deprecated, please use '<%= cmd %>' instead.`,
            METADATA:
                "<span style='color: gray;'>Create UID</span>: <%= create_uid %><br>" +
                "<span style='color: gray;'>Create Date</span>: <%= create_date %><br>" +
                "<span style='color: gray;'>Write UID</span>: <%= write_uid %><br>" +
                "<span style='color: gray;'>Write Date</span>: <%= write_date %><br>" +
                "<span style='color: gray;'>No Update</span>: <%= noupdate %><br>" +
                "<span style='color: gray;'>XML-ID</span>: <%= xmlid %>",
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
