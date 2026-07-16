// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState} from 'preact/hooks';
import {Card, Table, Button, Row, Col, Input} from '../ui.mjs';
import processKeybind from '@common/utils/process_keybind';
import {IGNORED_KEYS} from '@common/constants';
import {t} from '../i18n.mjs';

export default function ShortcutsSection({settings, mutate}: any) {
  const [newKeybind, setNewKeybind] = useState<string>('');
  const [newKeybindValue, setNewKeybindValue] = useState<string>('');
  const [newCommand, setNewCommand] = useState<string>('');

  const columns = [
    {title: t('optionsTitleShortcutsKeybind', 'Keybind'), dataIndex: 'display'},
    {title: t('optionsTitleShortcutsCommand', 'Command'), dataIndex: 'command'},
    {title: '', dataIndex: 'actions', width: 120},
  ];
  const defs = settings.shortcuts || {};
  const shortcuts = Object.entries(defs).map(([keybind, command]) => ({
    keybind,
    display: JSON.parse(keybind || '[]').join(' + '),
    command,
  }));

  const onKeyDownShortcut = (e: KeyboardEvent) => {
    const keybind = processKeybind(e);
    if (IGNORED_KEYS.indexOf(e.key) === -1 && e.key) {
      setNewKeybindValue(JSON.stringify(keybind));
      setNewKeybind(keybind.join(' + '));
    } else {
      setNewKeybindValue('');
      setNewKeybind(keybind.length ? `${keybind.join(' + ')} + ` : '');
    }
    e.preventDefault();
  };
  const onKeyUpShortcut = () => {
    if (!newKeybindValue) setNewKeybind('');
  };
  const addShortcut = () => {
    if (!newKeybindValue || !newCommand) return;
    const kb = newKeybindValue;
    const cmd = newCommand;
    mutate((s: any) => {
      s.shortcuts = {...(s.shortcuts || {}), [kb]: cmd};
    });
    setNewKeybind('');
    setNewKeybindValue('');
    setNewCommand('');
  };
  const removeShortcut = (keybind: string) => {
    mutate((s: any) => {
      const sc = {...(s.shortcuts || {})};
      delete sc[keybind];
      s.shortcuts = sc;
    });
  };

  return h(Card, {title: t('optionsTitleShortcuts', 'Shortcuts'), class: 'ot-card'},
    h(Table, {
      dataSource: shortcuts,
      columns,
      size: 'small',
      rowKey: 'keybind',
      style: {marginBottom: '16px'},
      bodyCell: ({column, record}: any) => {
        if (column.dataIndex === 'actions') {
          return h(Button, {danger: true, size: 'small', onClick: () => removeShortcut(record.keybind)}, t('optionsTitleShortcutsRemove', 'Remove'));
        }
        return record[column.dataIndex];
      },
    }),
    h(Row, {gutter: [10, 10]},
      h(Col, {flex: '1 1 200px'},
        h(Input, {
          value: newKeybind,
          'onUpdate:value': (v: string) => setNewKeybind(v),
          placeholder: t('optionsTitleShortcutsPressKeys', 'Press keys...'),
          readonly: true,
          onKeydown: onKeyDownShortcut,
          onKeyup: onKeyUpShortcut,
        })),
      h(Col, {flex: '1 1 200px'},
        h(Input, {
          value: newCommand,
          'onUpdate:value': (v: string) => setNewCommand(v),
          placeholder: t('optionsTitleShortcutsCommand', 'Command'),
        })),
      h(Col, {flex: '0 0 auto'},
        h(Button, {type: 'primary', onClick: addShortcut}, t('optionsTitleShortcutsAdd', 'Add')))));
}
