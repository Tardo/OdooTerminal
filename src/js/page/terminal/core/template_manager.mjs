// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export function renderTerminal() {
  return (
    "<div id='terminal' class='o_terminal'>" +
    "<div class='terminal-screen-info-zone'>" +
    "<span class='terminal-screen-running-cmds' id='terminal_running_cmd_count'></span>" +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-maximize p-2' role='button' title='Maximize'>" +
    "<i class='fa fa-window-maximize'></i>" +
    "</div>" +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-pin p-2' role='button' title='Pin'>" +
    "<i class='fa fa-map-pin'></i>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

export function renderErrorMessage(values) {
  return (
    "<div>" +
    `<h4>${values.error_name}</h4>` +
    `<span>${values.error_message}</span>` +
    "<ul>" +
    "<li name='exception_type'>" +
    `<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseExceptionType${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseExceptionType${values.error_id}'>` +
    "Exception Type" +
    "</a>" +
    `<div class='collapse' id='collapseExceptionType${values.error_id}'>` +
    `<div class='card card-body'>${values.exception_type}</div>` +
    "</div>" +
    "</li>" +
    "<li name='context'>" +
    `<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseContext${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseContext${values.error_id}'>` +
    "Context" +
    "</a>" +
    `<div class='collapse' id='collapseContext${values.error_id}'>` +
    `<div class='card card-body'>${values.context}</div>` +
    "</div>" +
    "</li>" +
    "<li name='args'>" +
    `<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseArguments${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseArguments${values.error_id}'>` +
    "Arguments" +
    "</a>" +
    `<div class='collapse' id='collapseArguments${values.error_id}'>` +
    `<div class='card card-body'>${values.args}</div>` +
    "</div>" +
    "</li>" +
    "<li name='debug'>" +
    `<a class='btn btn-sm btn-secondary' data-toggle='collapse' href='#collapseDebug${values.error_id}' role='button' aria-expanded='false' aria-controls='collapseDebug${values.error_id}'>` +
    "Debug" +
    "</a>" +
    `<div class='collapse' id='collapseDebug${values.error_id}'>` +
    `<div class='card card-body'>${values.debug}</div>` +
    "</div>" +
    "</li>" +
    "</ul>" +
    "</div>"
  );
}

export function renderTable(values) {
  return (
    "<table class='print-table'>" +
    "<thead>" +
    "<tr>" +
    `<th>${values.thead}</th>` +
    "</tr>" +
    "</thead>" +
    "<tbody>" +
    values.tbody +
    "</tbody>" +
    "</table>"
  );
}

export function renderTableSearchId(values) {
  return `<td><span class='o_terminal_click o_terminal_cmd' data-cmd='view ${values.model} ${values.id}'>#${values.id}</span></td>`;
}

export function renderWhoami(values) {
  return (
    `<span style='color: gray;'>Login</span>: ${values.login}<br>` +
    `<span style='color: gray;'>User</span>: ${values.display_name} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.users ${values.user_id}'>#${values.user_id}</span>)<br>` +
    `<span style='color: gray;'>Partner</span>: ${values.partner[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.partner ${values.partner[0]}'>#${values.partner[0]}</span>)<br>` +
    `<span style='color: gray;'>Active Company</span>: ${values.company[1]} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view res.company ${values.company[0]}'>#${values.company[0]}</span>)<br>` +
    `<span style='color: gray;'>In Companies</span>: ${values.companies}<br>` +
    `<span style='color: gray;'>In Groups</span>: ${values.groups}`
  );
}

export function renderWhoamiListItem(values) {
  return `<br>\u00A0\u00A0- ${values.name} (<span class='o_terminal_click o_terminal_cmd' data-cmd='view ${values.model} ${values.id}'>#${values.id}</span>)`;
}

export function renderUnknownCommand(values) {
  return `Unknown command '${values.org_cmd}' at ${values.pos[0]}:${values.pos[1]}. Did you mean '<strong class='o_terminal_click o_terminal_cmd' data-cmd='help ${values.cmd}'>${values.cmd}</strong>'?`;
}

export function renderPromptCmdHiddenArgs(values) {
  return `${values.prompt} ${values.cmd.split(" ")[0]} *****`;
}

export function renderPromptCmd(values) {
  return `${values.prompt} ${values.cmd}`;
}

export function renderWelcome(values) {
  return `<strong class='o_terminal_title'>Odoo Terminal v${values.ver}</strong>`;
}

export function renderHelpCmd(values) {
  return `<strong class='o_terminal_click o_terminal_cmd' data-cmd='help ${values.cmd}'>${values.cmd}</strong> - <i>${values.def}</i>`;
}

export function renderRecordCreated(values) {
  return `${values.model} record created successfully: <span class='o_terminal_click o_terminal_cmd' data-cmd='view ${values.model} ${values.new_id}'>${values.new_id}</span>`;
}

export function renderDeprecatedCommand(values) {
  return `** This command is deprecated, please use '${values.cmd}' instead.`;
}

export function renderMetadata(values) {
  return (
    `<span style='color: gray;'>Create UID</span>: ${values.create_uid}<br>` +
    `<span style='color: gray;'>Create Date</span>: ${values.create_date}<br>` +
    `<span style='color: gray;'>Write UID</span>: ${values.write_uid}<br>` +
    `<span style='color: gray;'>Write Date</span>: ${values.write_date}<br>` +
    `<span style='color: gray;'>No Update</span>: ${values.noupdate}<br>` +
    `<span style='color: gray;'>XML-ID</span>: ${values.xmlid}`
  );
}
