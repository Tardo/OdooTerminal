// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

export default function () {
  return (
    "<div id='terminal' class='o_terminal'>" +
    "<div class='terminal-screen-info-zone'>" +
    "<span class='terminal-screen-running-cmds' id='terminal_running_cmd_count'></span>" +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-maximize p-2' role='button' title='Maximize'>" +
    "<i class='fa fa-window-maximize'></i>" +
    '</div>' +
    "<div class='btn btn-sm btn-dark terminal-screen-icon-pin p-2' role='button' title='Pin'>" +
    "<i class='fa fa-map-pin'></i>" +
    '</div>' +
    '</div>' +
    '</div>'
  );
}
