// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import i18n from 'i18next';

export default function (): string {
  return (
    "<div id='terminal_pet' class='terminal-pet' role='button' tabindex='0' title='" +
    i18n.t('terminal.pet.tooltip', 'OdooTerminal guardian — click to open and see the last note') +
    "'>" +
    "<div class='terminal-pet-bubble'></div>" +
    "<div class='terminal-pet-orb'>" +
    "<i class='fa fa-magic terminal-pet-icon' aria-hidden='true'></i>" +
    '</div>' +
    '</div>'
  );
}
