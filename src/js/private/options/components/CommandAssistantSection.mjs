// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Form, FormItem, InputNumber, Switch, Select, SelectOption} from 'ant-design-vue';
import {t} from '../i18n.mjs';

export default defineComponent({
  name: 'CommandAssistantSection',
  props: {
    settings: {type: Object, required: true},
  },
  render() {
    const s = this.settings;
    return h(Card, {title: t('optionsTitleCommandAssistant', 'Command Assistant'), class: 'ot-card'}, {
      default: () =>
        h(Form, {layout: 'vertical'}, () => [
          h(FormItem, null, () =>
            h('div', {class: 'ot-switch-line'}, [
              h(Switch, {
                checked: s.cmd_assistant_dyn_options_disabled,
                'onUpdate:checked': (v) => { s.cmd_assistant_dyn_options_disabled = v; },
              }),
              h('span', {class: 'ot-switch-label'}, t('optionsTitleCommandAssistantDynOptionsDisabled', 'Disable dynamic options')),
            ]),
          ),
          h(FormItem, {label: t('optionsTitleCommandAssistantMatchMode', 'Match mode')}, () =>
            h(
              Select,
              {value: s.cmd_assistant_match_mode, 'onUpdate:value': (v) => { s.cmd_assistant_match_mode = v; }, style: {width: '240px'}},
              () => [
                h(SelectOption, {value: 'startsWith'}, () => t('optionsTitleCommandAssistantMatchModeStartsWith', 'Starts with')),
                h(SelectOption, {value: 'includes'}, () => t('optionsTitleCommandAssistantMatchModeIncludes', 'Includes')),
              ],
            ),
          ),
          h(FormItem, {label: t('optionsTitleCommandAssistantMaxResults', 'Max. results')}, () =>
            h(InputNumber, {value: s.cmd_assistant_max_results, 'onUpdate:value': (v) => { s.cmd_assistant_max_results = v; }, min: 1, max: 50}),
          ),
        ]),
    });
  },
});
