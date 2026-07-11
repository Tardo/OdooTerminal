// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Textarea} from 'ant-design-vue';
import {t} from '../i18n.mjs';

export default defineComponent({
  name: 'InitCommandsSection',
  props: {
    settings: {type: Object, required: true},
  },
  render() {
    const s = this.settings;
    return h(Card, {title: t('optionsTitleInitCommands', 'Init Commands'), class: 'ot-card'}, {
      default: () => [
        h('p', {class: 'ot-hint'}, t('optionsTitleInitCommandsDescription', 'Run these commands when initialize the terminal (one per line).')),
        h(Textarea, {
          value: s.init_cmds,
          'onUpdate:value': (v) => { s.init_cmds = v; },
          rows: 6,
          placeholder: 'clear\nhelp',
          style: {fontFamily: 'monospace'},
        }),
      ],
    });
  },
});
