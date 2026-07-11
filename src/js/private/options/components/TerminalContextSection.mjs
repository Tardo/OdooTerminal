// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Textarea, message} from 'ant-design-vue';
import {t} from '../i18n.mjs';

export default defineComponent({
  name: 'TerminalContextSection',
  props: {
    settings: {type: Object, required: true},
  },
  data() {
    return {
      rawJson: JSON.stringify(this.settings.term_context || {}, null, 4),
    };
  },
  watch: {
    'settings.term_context': {
      handler(val) {
        this.rawJson = JSON.stringify(val || {}, null, 4);
      },
      deep: true,
    },
  },
  methods: {
    onInput(val) {
      this.rawJson = val;
      try {
        this.settings.term_context = JSON.parse(val);
      } catch (_e) {
        // ignore invalid JSON while typing
      }
    },
    onBlur() {
      try {
        const parsed = JSON.parse(this.rawJson);
        this.settings.term_context = parsed;
        this.rawJson = JSON.stringify(parsed, null, 4);
      } catch (_e) {
        message.error(t('optionsTermContextInvalidJson', 'Invalid JSON format'));
      }
    },
  },
  render() {
    return h(Card, {title: t('optionsTitleTerminalContext', 'Terminal Context'), class: 'ot-card'}, {
      default: () => [
        h('p', {class: 'ot-hint'}, t('optionsTitleTerminalContextDescription', 'This context will be merged with the "normal" context on terminal operations. In json format.')),
        h(Textarea, {
          value: this.rawJson,
          'onUpdate:value': this.onInput,
          onBlur: this.onBlur,
          rows: 8,
          placeholder: '{"active_test": false}',
          style: {fontFamily: 'monospace'},
        }),
      ],
    });
  },
});
