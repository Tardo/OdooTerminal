// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (): string {
  return (
    "<div id='terminal' class='o_terminal'>" +
    "<div id='terminal_ai_idle' class='terminal-ai-idle-overlay'>" +
    "<div class='terminal-ai-idle-orb'>" +
    "<div class='terminal-ai-idle-ring terminal-ai-idle-ring-outer'></div>" +
    "<div class='terminal-ai-idle-ring terminal-ai-idle-ring-inner'></div>" +
    "<i class='fa fa-magic terminal-ai-idle-icon' aria-hidden='true'></i>" +
    "<span class='terminal-ai-idle-spark terminal-ai-idle-spark-1' aria-hidden='true'>✦</span>" +
    "<span class='terminal-ai-idle-spark terminal-ai-idle-spark-2' aria-hidden='true'>✦</span>" +
    "<span class='terminal-ai-idle-spark terminal-ai-idle-spark-3' aria-hidden='true'>✦</span>" +
    "<span class='terminal-ai-idle-spark terminal-ai-idle-spark-4' aria-hidden='true'>✦</span>" +
    "<span class='terminal-ai-idle-spark terminal-ai-idle-spark-5' aria-hidden='true'>✦</span>" +
    "<span class='terminal-ai-idle-spark terminal-ai-idle-spark-6' aria-hidden='true'>✦</span>" +
    "</div>" +
    "</div>" +
    "<div id='terminal_ai_sidebar' class='terminal-ai-sidebar'>" +
    "<div class='terminal-ai-sidebar-header'>" +
    "<div class='terminal-ai-sidebar-title-group'>" +
    "<span class='terminal-ai-sidebar-title'>AI</span>" +
    "<div class='btn btn-sm terminal-ai-sysprompt-btn p-1' role='button' title='" +
    i18n.t('terminal.tooltip.customSystemPrompt', 'Custom system prompt') +
    "'>" +
    "<i class='fa fa-sliders'></i>" +
    '</div>' +
    "<div class='btn btn-sm terminal-ai-help-btn p-1' role='button' title='" +
    i18n.t('terminal.tooltip.aiTips', 'AI tips') +
    "'>" +
    "<i class='fa fa-question-circle'></i>" +
    '</div>' +
    '</div>' +
    "<div class='btn btn-sm terminal-ai-new-conv p-1' role='button' title='" +
    i18n.t('terminal.tooltip.newConversation', 'New conversation') +
    "'>" +
    "<i class='fa fa-plus'></i>" +
    '</div>' +
    '</div>' +
    "<div id='terminal_ai_sysprompt_panel' class='terminal-ai-sysprompt-panel'>" +
    "<div class='terminal-ai-sysprompt-label'></div>" +
    "<textarea id='terminal_ai_sysprompt' class='terminal-ai-sysprompt-textarea' rows='6'></textarea>" +
    '</div>' +
    "<div id='terminal_ai_help_popup' class='terminal-ai-help-popup'></div>" +
    "<div class='terminal-ai-model-selector'>" +
    "<select id='terminal_ai_provider_select' class='terminal-ai-model-select'>" +
    "<option value=''>-- No provider --</option>" +
    '</select>' +
    "<select id='terminal_ai_model_select' class='terminal-ai-model-select' disabled>" +
    "<option value=''>-- No model --</option>" +
    '</select>' +
    '</div>' +
    "<div id='terminal_ai_conv_list' class='terminal-ai-conv-list'></div>" +
    '</div>' +
    "<div class='terminal-screen-info-zone'>" +
    "<span class='terminal-screen-running-cmds' id='terminal_running_cmd_count'></span>" +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-debug p-2' role='button' title='" +
    i18n.t('terminal.tooltip.debug', 'Toggle debug mode') +
    "'>" +
    "<i class='fa fa-bug'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark border-warning mr-5 me-5 terminal-screen-icon-reload-shell p-2' role='button' title='" +
    i18n.t('terminal.tooltip.reloadShell', 'Reload Shell') +
    "'>" +
    "<i class='fa fa-refresh'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-maximize p-2 rounded-left' role='button' title='" +
    i18n.t('terminal.tooltip.maximize', 'Maximize') +
    "'>" +
    "<i class='fa fa-window-maximize'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-pin p-2 rounded-0' role='button' title='" +
    i18n.t('terminal.tooltip.pin', 'Pin') +
    "'>" +
    "<i class='fa fa-map-pin'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-multiline p-2 rounded-0' role='button' title='" +
    i18n.t('terminal.tooltip.multiLine', 'Multi-line') +
    "'>" +
    "<i class='fa fa-code'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-ai-mode p-2 rounded-right' role='button' title='" +
    i18n.t('terminal.tooltip.aiMode', 'AI Mode') +
    "'>" +
    "<span class='terminal-ai-btn-sparkle' aria-hidden='true'>✦</span>" +
    "<span class='terminal-ai-btn-sparkle' aria-hidden='true'>✦</span>" +
    "<span class='terminal-ai-btn-sparkle' aria-hidden='true'>✦</span>" +
    "<i class='fa fa-magic'></i>" +
    '</div>' +
    '</div>' +
    '</div>'
  );
}
