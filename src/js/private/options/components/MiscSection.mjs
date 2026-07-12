// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {Card, Field, Input, InputNumber, Switch, Select, SelectOption, Row, Col} from '../ui.mjs';
import {t} from '../i18n.mjs';

export default function MiscSection({settings, mutate}: any) {
  const switchRow = (key: string, label: any) =>
    h(Field, null,
      h('div', {class: 'ot-switch-line'},
        h(Switch, {checked: settings[key], 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s[key] = v; })}),
        h('span', {class: 'ot-switch-label'}, label)));

  return h(Card, {title: t('optionsTitleMisc', 'Misc'), class: 'ot-card'},
    h('div', {class: 'ot-form'},
      h(Row, {gutter: [16, 0]},
        h(Col, null, switchRow('show_execution_time', t('optionsTitleMiscShowExecutionTime', 'Show Execution Time'))),
        h(Col, null, switchRow('hightlight_words', t('optionsTitleMiscHighlightWords', 'Highlight Words'))),
        h(Col, null,
          h(Field, null,
            h('div', {class: 'ot-switch-line'},
              h(Switch, {checked: settings.show_technical_model, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.show_technical_model = v; })}),
              h('span', {class: 'ot-switch-label'},
                t('optionsTitleMiscShowTechnicalModel', 'Show Technical Model Name'),
                h('span', {style: 'font-size: 12px; color: #6c757d; margin-left: 4px;'},
                  ' (' + t('optionsTitleMiscShowTechnicalModelHint', 'Odoo 17+ only') + ')')))))),
      h(Field, {label: t('optionsTitleMiscShowTechnicalModelMinVersion', 'Minimum Odoo Version')},
        h(Select, {
          value: settings.show_technical_model_min_version || '18',
          'onUpdate:value': (v: string) => mutate((s: any) => { s.show_technical_model_min_version = v; }),
          disabled: !settings.show_technical_model,
        },
          h(SelectOption, {value: '17'}, 'Odoo 17+'),
          h(SelectOption, {value: '18'}, 'Odoo 18+'),
          h(SelectOption, {value: '19'}, 'Odoo 19+'))),
      h(Field, {label: t('optionsTitleMiscHighlightWordsList', 'Highlight Words List')},
        h(Input, {
          value: (settings.hightlight_words_list || []).join(', '),
          'onUpdate:value': (v: string) => mutate((s: any) => {
            s.hightlight_words_list = v.split(',').map((x: string) => x.trim()).filter(Boolean);
          }),
          placeholder: 'keyword1, keyword2, keyword3',
        })),
      h(Row, {gutter: 16},
        h(Col, null,
          h(Field, {label: t('optionsTitleMiscRlimitValue', 'Limit Records')},
            h(InputNumber, {value: settings.rlimit_value, 'onUpdate:value': (v: number) => mutate((s: any) => { s.rlimit_value = v; }), min: 0}))),
        h(Col, null,
          h(Field, {label: t('optionsTitleMiscScreenBufferSize', 'Screen Buffer Size')},
            h(InputNumber, {value: settings.screen_buffer_size, 'onUpdate:value': (v: number) => mutate((s: any) => { s.screen_buffer_size = v; }), min: 0}))))));
}
