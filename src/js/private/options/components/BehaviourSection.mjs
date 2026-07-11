// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Form, FormItem, Select, SelectOption, Checkbox, Row, Col} from 'ant-design-vue';
import {t, changeLanguage} from '../i18n.mjs';

export default defineComponent({
  name: 'BehaviourSection',
  props: {
    settings: {type: Object, required: true},
  },
  render() {
    const s = this.settings;
    return h(Card, {title: t('optionsTitleBehaviour', 'Behaviour'), class: 'ot-card'}, {
      default: () =>
        h(Form, {layout: 'vertical'}, () => [
          h(FormItem, {label: t('optionsLanguage', 'Language')}, () =>
            h(
              Select,
              {
                value: s.language,
                'onUpdate:value': async (v) => {
                  s.language = v;
                  await changeLanguage(v);
                },
                style: {width: '240px'},
              },
              () => [
                h(SelectOption, {value: 'auto'}, () => t('optionsLanguageAuto', 'Auto')),
                h(SelectOption, {value: 'en'}, () => 'English'),
                h(SelectOption, {value: 'es'}, () => 'Español (España)'),
                h(SelectOption, {value: 'zh'}, () => '中文'),
              ],
            ),
          ),
          h(Row, {gutter: [16, 8]}, () => [
            h(Col, {xs: 24, sm: 12, md: 6}, () =>
              h(Checkbox, {checked: s.pinned, 'onUpdate:checked': (v) => { s.pinned = v; }}, () =>
                t('optionsTitleBehaviourPinned', 'Pinned'),
              ),
            ),
            h(Col, {xs: 24, sm: 12, md: 6}, () =>
              h(Checkbox, {checked: s.maximized, 'onUpdate:checked': (v) => { s.maximized = v; }}, () =>
                t('optionsTitleBehaviourMaximized', 'Maximized'),
              ),
            ),
            h(Col, {xs: 24, sm: 12, md: 6}, () =>
              h(Checkbox, {checked: s.multiline, 'onUpdate:checked': (v) => { s.multiline = v; }}, () =>
                t('optionsTitleBehaviourMultiline', 'Multi-line'),
              ),
            ),
            h(Col, {xs: 24, sm: 12, md: 6}, () =>
              h(Checkbox, {checked: s.elephant, 'onUpdate:checked': (v) => { s.elephant = v; }}, () =>
                t('optionsTitleBehaviourElephant', 'Resolve unknown values'),
              ),
            ),
          ]),
        ]),
    });
  },
});
