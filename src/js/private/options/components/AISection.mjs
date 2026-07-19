// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState} from 'preact/hooks';
import {Card} from '../ui.mjs';
import {t} from '../i18n.mjs';
import AIModelsSection from './AIModelsSection.mjs';
import AISkillsSection from './AISkillsSection.mjs';
import MCPServersSection from './MCPServersSection.mjs';
import AIPetSection from './AIPetSection.mjs';

const TABS = [
  {key: 'models', label: () => t('optionsTitleAIModels', 'AI Providers'), comp: AIModelsSection},
  {key: 'skills', label: () => t('optionsTitleAICustomSkills', 'AI Skills'), comp: AISkillsSection},
  {key: 'mcp', label: () => t('optionsTitleMCPServers', 'MCP Servers'), comp: MCPServersSection},
  {key: 'pet', label: () => t('optionsTitleAIPet', 'Guardian Pet'), comp: AIPetSection},
];

export default function AISection(props: any) {
  const [active, setActive] = useState<string>('models');
  const tab = TABS.find((tb) => tb.key === active) || TABS[0];
  return h(Card, {title: t('optionsTitleAI', 'AI'), class: 'ot-card'},
    h('div', {class: 'ot-tabs-nav'},
      TABS.map((tb) => h('button', {
        key: tb.key,
        type: 'button',
        class: `ot-tabs-tab${tb.key === active ? ' active' : ''}`,
        onClick: () => setActive(tb.key),
      }, tb.label()))),
    h('div', {class: 'ot-tabs-content'}, h(tab.comp, props)));
}
