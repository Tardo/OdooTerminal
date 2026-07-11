// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Table, Button, Row, Col, Input} from 'ant-design-vue';
import processKeybind from '@common/utils/process_keybind';
import {IGNORED_KEYS} from '@common/constants';
import {t} from '../i18n.mjs';

export default defineComponent({
  name: 'ShortcutsSection',
  props: {
    settings: {type: Object, required: true},
  },
  data() {
    return {
      newKeybind: '',
      newKeybindValue: '',
      newCommand: '',
    };
  },
  computed: {
    // Columns live in computed (not data) so their titles re-resolve t() on
    // every render — data() runs once before i18n is ready and would pin the
    // English fallback forever.
    columns() {
      return [
        {title: t('optionsTitleShortcutsKeybind', 'Keybind'), dataIndex: 'display'},
        {title: t('optionsTitleShortcutsCommand', 'Command'), dataIndex: 'command'},
        {title: '', dataIndex: 'actions', width: 120},
      ];
    },
    shortcuts() {
      const defs = this.settings.shortcuts || {};
      return Object.entries(defs).map(([keybind, command]) => ({
        keybind,
        display: JSON.parse(keybind || '[]').join(' + '),
        command,
      }));
    },
  },
  methods: {
    onKeyDownShortcut(e) {
      const keybind = processKeybind(e);
      if (IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
        this.newKeybindValue = JSON.stringify(keybind);
        this.newKeybind = keybind.join(' + ');
      } else {
        this.newKeybindValue = '';
        this.newKeybind = keybind.length ? `${keybind.join(' + ')} + ` : '';
      }
      e.preventDefault();
    },
    onKeyUpShortcut() {
      if (!this.newKeybindValue) this.newKeybind = '';
    },
    addShortcut() {
      if (!this.newKeybindValue || !this.newCommand) return;
      this.settings.shortcuts = {...(this.settings.shortcuts || {}), [this.newKeybindValue]: this.newCommand};
      this.newKeybind = '';
      this.newKeybindValue = '';
      this.newCommand = '';
    },
    removeShortcut(keybind) {
      const shortcuts = {...(this.settings.shortcuts || {})};
      delete shortcuts[keybind];
      this.settings.shortcuts = shortcuts;
    },
  },
  render() {
    return h(Card, {title: t('optionsTitleShortcuts', 'Shortcuts'), class: 'ot-card'}, {
      default: () => [
        h(
          Table,
          {
            dataSource: this.shortcuts,
            columns: this.columns,
            pagination: false,
            size: 'small',
            rowKey: 'keybind',
            style: {marginBottom: '16px'},
          },
          {
            bodyCell: ({column, record}) => {
              if (column.dataIndex === 'actions') {
                return h(
                  Button,
                  {danger: true, size: 'small', onClick: () => this.removeShortcut(record.keybind)},
                  () => t('optionsTitleShortcutsRemove', 'Remove'),
                );
              }
              return record[column.dataIndex];
            },
          },
        ),
        h(Row, {gutter: [10, 10]}, () => [
          h(
            Col,
            {xs: 24, sm: 8},
            () =>
              h(Input, {
                value: this.newKeybind,
                'onUpdate:value': (v) => { this.newKeybind = v; },
                placeholder: t('optionsTitleShortcutsPressKeys', 'Press keys...'),
                readonly: true,
                onKeydown: this.onKeyDownShortcut,
                onKeyup: this.onKeyUpShortcut,
              }),
          ),
          h(
            Col,
            {xs: 24, sm: 8},
            () =>
              h(Input, {
                value: this.newCommand,
                'onUpdate:value': (v) => { this.newCommand = v; },
                placeholder: t('optionsTitleShortcutsCommand', 'Command'),
              }),
          ),
          h(Col, {xs: 24, sm: 8}, () => h(Button, {type: 'primary', onClick: this.addShortcut}, () => t('optionsTitleShortcutsAdd', 'Add'))),
        ]),
      ],
    });
  },
});
