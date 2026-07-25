// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (): string {
  return (
    "<div id='terminal_watchdog' class='terminal-watchdog' role='button' tabindex='0' title='" +
    i18n.t('terminal.watchdog.tooltip', 'OdooTerminal AI Watchdog — click to see the message history') +
    "'>" +
    "<div class='terminal-watchdog-bubble'></div>" +
    "<div class='terminal-watchdog-orb'>" +
    "<i class='fa fa-magic terminal-watchdog-icon' aria-hidden='true'></i>" +
    '</div>' +
    '</div>'
  );
}
