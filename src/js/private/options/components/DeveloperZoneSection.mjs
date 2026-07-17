// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {Card, Checkbox} from '../ui.mjs';
import {t} from '../i18n.mjs';

export default function DeveloperZoneSection({settings, mutate}: any) {
  return h(Card, {title: t('optionsTitleDeveloperZone', 'Extension Developer Zone'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleDeveloperZoneDescription', 'Options for developers of OdooTerminal itself. Most users can leave these off.')),
    h('div', {class: 'ot-check-stack'},
      h(Checkbox, {checked: settings.devmode_tests, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.devmode_tests = v; })},
        t('optionsTitleDeveloperZoneModeTests', 'Use OdooTerminalTests')),
      h(Checkbox, {checked: settings.devmode_ignore_comp_checks, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.devmode_ignore_comp_checks = v; })},
        t('optionsTitleDeveloperZoneModeIgnoreCompChecks', 'Disable Odoo version checking')),
      h(Checkbox, {checked: settings.devmode_console_errors, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.devmode_console_errors = v; })},
        t('optionsTitleDeveloperZoneModeConsoleErrors', 'Show errors in the browser console'))));
}
