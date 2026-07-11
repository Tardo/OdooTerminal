// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Form, FormItem, Input, InputNumber, Switch, Select, SelectOption, Row, Col} from 'ant-design-vue';
import {t} from '../i18n.mjs';

export default defineComponent({
  name: 'MiscSection',
  props: {
    settings: {type: Object, required: true},
  },
  render() {
    const s = this.settings;
    const switchRow = (key, label) =>
      h(FormItem, null, () =>
        h('div', {class: 'ot-switch-line'}, [
          h(Switch, {checked: s[key], 'onUpdate:checked': (v) => { s[key] = v; }}),
          h('span', {class: 'ot-switch-label'}, label),
        ]),
      );

    return h(Card, {title: t('optionsTitleMisc', 'Misc'), class: 'ot-card'}, {
      default: () =>
        h(Form, {layout: 'vertical'}, () => [
          h(Row, {gutter: [16, 0]}, () => [
            h(Col, {xs: 24, sm: 8}, () => switchRow('show_execution_time', t('optionsTitleMiscShowExecutionTime', 'Show Execution Time'))),
            h(Col, {xs: 24, sm: 8}, () => switchRow('hightlight_words', t('optionsTitleMiscHighlightWords', 'Highlight Words'))),
            h(Col, {xs: 24, sm: 8}, () =>
              h(FormItem, null, () =>
                h('div', {class: 'ot-switch-line'}, [
                  h(Switch, {checked: s.show_technical_model, 'onUpdate:checked': (v) => { s.show_technical_model = v; }}),
                  h('span', {class: 'ot-switch-label'}, [
                    t('optionsTitleMiscShowTechnicalModel', 'Show Technical Model Name'),
                    h('span', {style: 'font-size: 12px; color: #6c757d; margin-left: 4px;'}, ' (' + t('optionsTitleMiscShowTechnicalModelHint', 'Odoo 17+ only') + ')'),
                  ]),
                ]),
              ),
            ),
          ]),
          h(FormItem, {label: t('optionsTitleMiscShowTechnicalModelMinVersion', 'Minimum Odoo Version')}, () =>
            h(Select, {
              value: s.show_technical_model_min_version || '18',
              'onUpdate:value': (v) => { s.show_technical_model_min_version = v; },
              disabled: !s.show_technical_model,
            }, () => [
              h(SelectOption, {value: '17'}, () => 'Odoo 17+'),
              h(SelectOption, {value: '18'}, () => 'Odoo 18+'),
              h(SelectOption, {value: '19'}, () => 'Odoo 19+'),
            ]),
          ),
          h(FormItem, {label: t('optionsTitleMiscHighlightWordsList', 'Highlight Words List')}, () =>
            h(Input, {
              value: (s.hightlight_words_list || []).join(', '),
              'onUpdate:value': (v) => { s.hightlight_words_list = v.split(',').map((x) => x.trim()).filter(Boolean); },
              placeholder: 'keyword1, keyword2, keyword3',
            }),
          ),
          h(Row, {gutter: 16}, () => [
            h(Col, {xs: 24, sm: 12}, () =>
              h(FormItem, {label: t('optionsTitleMiscRlimitValue', 'Limit Records')}, () =>
                h(InputNumber, {value: s.rlimit_value, 'onUpdate:value': (v) => { s.rlimit_value = v; }, min: 0}, null),
              ),
            ),
            h(Col, {xs: 24, sm: 12}, () =>
              h(FormItem, {label: t('optionsTitleMiscScreenBufferSize', 'Screen Buffer Size')}, () =>
                h(InputNumber, {value: s.screen_buffer_size, 'onUpdate:value': (v) => { s.screen_buffer_size = v; }, min: 0}, null),
              ),
            ),
          ]),
        ]),
    });
  },
});
