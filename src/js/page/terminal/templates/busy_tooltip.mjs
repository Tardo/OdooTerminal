// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import renderIcon from './icon';

export default function (): string {
  return (
    "<div id='terminal_busy_tooltip' class='o_terminal-busy-tooltip' role='button'>" +
    renderIcon('fa-cog', 'fa-spin') +
    "<span class='o_terminal-busy-tooltip-text'></span>" +
    '</div>'
  );
}
