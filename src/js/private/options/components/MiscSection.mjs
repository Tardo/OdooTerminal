// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {Card, Field, Input, InputNumber, Switch, Select, SelectOption, Divider, Row, Col} from '../ui.mjs';
import {t} from '../i18n.mjs';
import {DEFAULT_SCREEN_BUFFER_SIZE} from '@common/constants';

export default function MiscSection({settings, mutate}: any) {
  const switchRow = (key: string, label: any) =>
    h(Field, null,
      h('div', {class: 'ot-switch-line'},
        h(Switch, {checked: settings[key], 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s[key] = v; })}),
        h('span', {class: 'ot-switch-label'}, label)));

  return h(Card, {title: t('optionsTitleMisc', 'Misc'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleMiscDescription', 'Other display and command settings that don\'t fit elsewhere.')),
    h('div', {class: 'ot-form'},
      switchRow('show_execution_time', t('optionsTitleMiscShowExecutionTime', 'Show Execution Time')),

      h(Divider, {orientation: 'left'}, t('optionsTitleMiscHighlightWords', 'Highlight Words')),
      switchRow('hightlight_words', t('optionsTitleMiscHighlightWords', 'Highlight Words')),
      h(Field, {label: t('optionsTitleMiscHighlightWordsList', 'Highlight Words List')},
        h(Input, {
          value: (settings.hightlight_words_list || []).join(', '),
          'onUpdate:value': (v: string) => mutate((s: any) => {
            s.hightlight_words_list = v.split(',').map((x: string) => x.trim()).filter(Boolean);
          }),
          placeholder: 'keyword1, keyword2, keyword3',
          disabled: !settings.hightlight_words,
        })),
      h('p', {class: 'ot-tip'}, t('optionsTitleMiscHighlightWordsListHint', "Comma-separated words to highlight in the terminal output when \"Highlight Words\" is enabled above.")),

      h(Divider, {orientation: 'left'}, t('optionsTitleMiscShowTechnicalModel', 'Show Technical Model Name')),
      h(Field, null,
        h('div', {class: 'ot-switch-line'},
          h(Switch, {checked: settings.show_technical_model, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.show_technical_model = v; })}),
          h('span', {class: 'ot-switch-label'},
            t('optionsTitleMiscShowTechnicalModel', 'Show Technical Model Name'),
            h('span', {style: 'font-size: 12px; color: #6c757d; margin-left: 4px;'},
              ' (' + t('optionsTitleMiscShowTechnicalModelHint', 'Odoo 17+ only') + ')')))),
      h('p', {class: 'ot-tip'}, t('optionsTitleMiscShowTechnicalModelDescriptionHint', 'Shows the internal Odoo model name (e.g. "res.partner") next to record titles, which you need when writing commands that target a specific model.')),
      h(Field, {label: t('optionsTitleMiscShowTechnicalModelMinVersion', 'Minimum Odoo Version')},
        h(Select, {
          value: settings.show_technical_model_min_version || '18',
          'onUpdate:value': (v: string) => mutate((s: any) => { s.show_technical_model_min_version = v; }),
          disabled: !settings.show_technical_model,
        },
          h(SelectOption, {value: '17'}, 'Odoo 17+'),
          h(SelectOption, {value: '18'}, 'Odoo 18+'),
          h(SelectOption, {value: '19'}, 'Odoo 19+'))),

      h(Divider, {orientation: 'left'}, t('optionsTitleMiscLimits', 'Limits')),
      h(Row, {gutter: 16},
        h(Col, null,
          h(Field, {label: t('optionsTitleMiscRlimitValue', 'Default Search Limit')},
            h(InputNumber, {
              value: settings.rlimit_value || undefined,
              'onUpdate:value': (v: number) => mutate((s: any) => { s.rlimit_value = v; }),
              min: 0,
              placeholder: t('optionsTitleMiscRlimitValuePlaceholder', 'No limit'),
            })),
          h('p', {class: 'ot-tip'}, t('optionsTitleMiscRlimitValueHint', 'Maximum records fetched by the "search" command when you don\'t specify a limit yourself. 0 = no limit.'))),
        h(Col, null,
          h(Field, {label: t('optionsTitleMiscScreenBufferSize', 'Screen Buffer Size')},
            h(InputNumber, {
              value: settings.screen_buffer_size || undefined,
              'onUpdate:value': (v: number) => mutate((s: any) => { s.screen_buffer_size = v; }),
              min: 0,
              placeholder: String(DEFAULT_SCREEN_BUFFER_SIZE),
            })),
          h('p', {class: 'ot-tip'}, t(
            'optionsTitleMiscScreenBufferSizeHint',
            'Maximum number of lines kept in the terminal output before older ones are dropped. Lower it if the terminal feels sluggish with long sessions. 0 = default ({{default}}).',
            {default: DEFAULT_SCREEN_BUFFER_SIZE},
          ))))));
}
