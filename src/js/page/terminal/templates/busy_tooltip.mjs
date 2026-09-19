// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

export default function (): string {
  return (
    "<div id='terminal_busy_tooltip' class='o_terminal-busy-tooltip' role='button'>" +
    "<i class='fa fa-cog fa-spin'></i>" +
    "<span class='o_terminal-busy-tooltip-text'></span>" +
    '</div>'
  );
}
