// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {Card, Field, Select, SelectOption, Checkbox, Row, Col} from '../ui.mjs';
import {t, changeLanguage} from '../i18n.mjs';

export default function BehaviourSection({settings, mutate}: any) {
  return h(Card, {title: t('optionsTitleBehaviour', 'Behaviour'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleBehaviourDescription', "General settings: interface language and how the terminal window opens (pinned open, maximized, multi-line input).")),
    h('div', {class: 'ot-form'},
      h(Field, {label: t('optionsLanguage', 'Language')},
        h(Select, {
          value: settings.language,
          'onUpdate:value': async (v: string) => {
            mutate((s: any) => {
              s.language = v;
            });
            await changeLanguage(v);
          },
          style: {width: '240px'},
        },
          h(SelectOption, {value: 'auto'}, t('optionsLanguageAuto', 'Auto')),
          h(SelectOption, {value: 'en'}, 'English'),
          h(SelectOption, {value: 'es'}, 'Español (España)'),
          h(SelectOption, {value: 'zh'}, '中文'))),
      h(Row, {gutter: [16, 8]},
        h(Col, null,
          h(Checkbox, {checked: settings.pinned, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.pinned = v; })},
            t('optionsTitleBehaviourPinned', 'Pinned'))),
        h(Col, null,
          h(Checkbox, {checked: settings.maximized, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.maximized = v; })},
            t('optionsTitleBehaviourMaximized', 'Maximized'))),
        h(Col, null,
          h(Checkbox, {checked: settings.multiline, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.multiline = v; })},
            t('optionsTitleBehaviourMultiline', 'Multi-line'))),
        h(Col, null,
          h(Checkbox, {checked: settings.elephant, 'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.elephant = v; })},
            t('optionsTitleBehaviourElephant', 'Resolve unknown values')),
          h('p', {class: 'ot-tip'}, t('optionsTitleBehaviourElephantHint', "If the current user or database name can't be read from the page, send an extra request to fetch them. A bit slower, but avoids showing them as unknown."))))));
}
