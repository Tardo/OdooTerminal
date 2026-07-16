// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {Card, Field, Switch, Select, SelectOption, InputNumber} from '../ui.mjs';
import {t} from '../i18n.mjs';

export default function CommandAssistantSection({settings, mutate}: any) {
  return h(Card, {title: t('optionsTitleCommandAssistant', 'Command Assistant'), class: 'ot-card'},
    h('div', {class: 'ot-form'},
      h(Field, null,
        h('div', {class: 'ot-switch-line'},
          h(Switch, {checked: settings.cmd_assistant_dyn_options_disabled, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.cmd_assistant_dyn_options_disabled = v; })}),
          h('span', {class: 'ot-switch-label'}, t('optionsTitleCommandAssistantDynOptionsDisabled', 'Disable dynamic options')))),
      h(Field, {label: t('optionsTitleCommandAssistantMatchMode', 'Match mode')},
        h(Select, {value: settings.cmd_assistant_match_mode, 'onUpdate:value': (v: string) => mutate((s: any) => { s.cmd_assistant_match_mode = v; }), style: {width: '240px'}},
          h(SelectOption, {value: 'startsWith'}, t('optionsTitleCommandAssistantMatchModeStartsWith', 'Starts with')),
          h(SelectOption, {value: 'includes'}, t('optionsTitleCommandAssistantMatchModeIncludes', 'Includes')))),
      h(Field, {label: t('optionsTitleCommandAssistantMaxResults', 'Max. results')},
        h(InputNumber, {value: settings.cmd_assistant_max_results, 'onUpdate:value': (v: number) => mutate((s: any) => { s.cmd_assistant_max_results = v; }), min: 1, max: 50}))));
}
