// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Checkbox} from 'ant-design-vue';
import {t} from '../i18n.mjs';

export default defineComponent({
  name: 'DeveloperZoneSection',
  props: {
    settings: {type: Object, required: true},
  },
  render() {
    const s = this.settings;
    return h(Card, {title: t('optionsTitleDeveloperZone', 'Extension Developer Zone'), class: 'ot-card'}, {
      default: () =>
        h('div', {class: 'ot-check-stack'}, () => [
          h(Checkbox, {checked: s.devmode_tests, 'onUpdate:checked': (v) => { s.devmode_tests = v; }}, () =>
            t('optionsTitleDeveloperZoneModeTests', 'Use OdooTerminalTests'),
          ),
          h(Checkbox, {checked: s.devmode_ignore_comp_checks, 'onUpdate:checked': (v) => { s.devmode_ignore_comp_checks = v; }}, () =>
            t('optionsTitleDeveloperZoneModeIgnoreCompChecks', 'Disable Odoo version checking'),
          ),
          h(Checkbox, {checked: s.devmode_console_errors, 'onUpdate:checked': (v) => { s.devmode_console_errors = v; }}, () =>
            t('optionsTitleDeveloperZoneModeConsoleErrors', 'Show errors in the browser console'),
          ),
        ]),
    });
  },
});
