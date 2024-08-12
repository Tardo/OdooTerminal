// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function (): string {
  return (
    "<div id='terminal' class='o_terminal'>" +
    "<div class='terminal-screen-info-zone'>" +
    "<span class='terminal-screen-running-cmds' id='terminal_running_cmd_count'></span>" +
    "<div class='btn btn-sm btn-dark border-warning mr-5 me-5 terminal-screen-icon-reload-shell p-2' role='button' title='Reload Shell'>" +
    "<i class='fa fa-refresh'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-maximize p-2 rounded-left' role='button' title='Maximize'>" +
    "<i class='fa fa-window-maximize'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-pin p-2 rounded-0' role='button' title='Pin'>" +
    "<i class='fa fa-map-pin'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-multiline p-2 rounded-right' role='button' title='Multi-line'>" +
    "<i class='fa fa-code'></i>" +
    '</div>' +
    '</div>' +
    '</div>'
  );
}
