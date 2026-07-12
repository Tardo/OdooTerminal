// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {Card, Textarea} from '../ui.mjs';
import {t} from '../i18n.mjs';

export default function InitCommandsSection({settings, mutate}: any) {
  return h(Card, {title: t('optionsTitleInitCommands', 'Init Commands'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleInitCommandsDescription', 'Run these commands when initialize the terminal (one per line).')),
    h(Textarea, {
      value: settings.init_cmds,
      'onUpdate:value': (v: string) => mutate((s: any) => {
        s.init_cmds = v;
      }),
      rows: 6,
      placeholder: 'clear\nhelp',
      style: {fontFamily: 'monospace'},
    }));
}
