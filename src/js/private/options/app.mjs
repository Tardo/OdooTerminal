// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h, render} from 'preact';
import {useEffect, useState, useRef} from 'preact/hooks';
import {Button, Tag, Spin, ModalHost, ToastHost, message, confirmDialog} from './ui.mjs';

import BehaviourSection from './components/BehaviourSection.mjs';
import ThemeSection from './components/ThemeSection.mjs';
import ShortcutsSection from './components/ShortcutsSection.mjs';
import CommandAssistantSection from './components/CommandAssistantSection.mjs';
import AIModelsSection from './components/AIModelsSection.mjs';
import AISkillsSection from './components/AISkillsSection.mjs';
import InitCommandsSection from './components/InitCommandsSection.mjs';
import TerminalContextSection from './components/TerminalContextSection.mjs';
import DeveloperZoneSection from './components/DeveloperZoneSection.mjs';
import MiscSection from './components/MiscSection.mjs';

import {useSettings} from './composables/useSettings.mjs';
import {t, initI18n} from './i18n.mjs';

type SectionDef = {id: string, title: () => string, comp: any};

const SECTIONS: Array<SectionDef> = [
  {id: 'behaviour', title: () => t('optionsTitleBehaviour', 'Behaviour'), comp: BehaviourSection},
  {id: 'theme', title: () => t('optionsTitleTheme', 'Theme'), comp: ThemeSection},
  {id: 'shortcuts', title: () => t('optionsTitleShortcuts', 'Shortcuts'), comp: ShortcutsSection},
  {id: 'command-assistant', title: () => t('optionsTitleCommandAssistant', 'Command Assistant'), comp: CommandAssistantSection},
  {id: 'ai-models', title: () => t('optionsTitleAIModels', 'AI Providers'), comp: AIModelsSection},
  {id: 'ai-skills', title: () => t('optionsTitleAICustomSkills', 'AI Skills'), comp: AISkillsSection},
  {id: 'init-commands', title: () => t('optionsTitleInitCommands', 'Init Commands'), comp: InitCommandsSection},
  {id: 'terminal-context', title: () => t('optionsTitleTerminalContext', 'Terminal Context'), comp: TerminalContextSection},
  {id: 'developer-zone', title: () => t('optionsTitleDeveloperZone', 'Developer Zone'), comp: DeveloperZoneSection},
  {id: 'misc', title: () => t('optionsTitleMisc', 'Misc'), comp: MiscSection},
];

// Created once at module load; signals keep state stable across renders.
const store = useSettings();

function App() {
  const {settings, loading, hasChanges, load, saveSettings, resetSettings, loadThemeValues, mutate} = store;
  const [bootstrapping, setBootstrapping] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState('behaviour');
  // Holds a timeout id while a smooth anchor scroll is in flight; scroll-spy
  // skips updates during this window so the highlight doesn't flicker through
  // every section the page passes en route to the target.
  const scrollLock = useRef(0);

  useEffect(() => {
    (async () => {
      document.title = 'OdooTerminal — ' + t('optionsSubtitle', 'Settings & Configuration');
      await load();
      await initI18n(settings.value.language);
      document.title = 'OdooTerminal — ' + t('optionsSubtitle', 'Settings & Configuration');
      setBootstrapping(false);
      setInterval(() => store.checkChanges(), 500);
    })();
  }, []);

  useEffect(() => {
    if (bootstrapping) return;
    const onScroll = () => {
      if (scrollLock.current) return;
      let current = SECTIONS[0].id;
      for (const sec of SECTIONS) {
        const el = document.getElementById(`sec-${sec.id}`);
        if (el && el.getBoundingClientRect().top <= 120) current = sec.id;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [bootstrapping]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings();
      message.success(t('optionsSaved', 'Settings saved successfully'));
    } catch (_err) {
      message.error(t('optionsSaveFailed', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirmDialog({
      title: t('optionsReset', 'Reset to Defaults'),
      content: t('optionsResetConfirm', 'This will reset all settings to their default values. Are you sure?'),
      okText: t('optionsReset', 'Reset to Defaults'),
      cancelText: t('cancel', 'Cancel'),
    });
    if (!ok) return;
    try {
      await resetSettings();
      message.success(t('optionsResetDone', 'Settings have been reset to defaults'));
    } catch (_err) {
      message.error(t('optionsResetFailed', 'Failed to reset settings'));
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(`sec-${id}`);
    if (!el) return;
    setActiveId(id);
    // Sticky header is 64px; leave a small gap so the section title breathes.
    const top = el.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({top, behavior: 'smooth'});
    window.clearTimeout(scrollLock.current);
    scrollLock.current = window.setTimeout(() => {
      scrollLock.current = 0;
    }, 700);
  };

  const s = settings.value;

  return h('div', {class: 'options-app'},
    h('header', {class: 'options-header'},
      h('div', {class: 'header-brand'},
        h('div', {class: 'brand-icon'}, h('span', {class: 'brand-icon-text'}, '>_')),
        h('div', {class: 'brand-text'},
          h('h1', {class: 'brand-title'}, 'OdooTerminal'),
          h('p', {class: 'brand-subtitle'}, t('optionsSubtitle', 'Settings & Configuration')))),
      h('div', {class: 'header-actions'},
        hasChanges.value
          ? h(Tag, {color: 'orange'}, t('optionsUnsavedChanges', 'Unsaved changes'))
          : h(Tag, {color: 'blue'}, t('optionsNoChanges', 'All changes saved')),
        h(Button, {onClick: handleReset, disabled: saving}, t('optionsReset', 'Reset to Defaults')),
        h(Button, {type: 'primary', onClick: handleSave, loading: saving, disabled: !hasChanges.value},
          t('optionsSave', 'Save Settings')))),
    h('div', {class: 'options-body'},
      h('aside', {class: 'options-sidenav'},
        h('nav', {class: 'ot-anchor'},
          SECTIONS.map((sec) => h('a', {
            key: sec.id,
            href: `#sec-${sec.id}`,
            class: `ot-anchor-link${activeId === sec.id ? ' active' : ''}`,
            onClick: (e) => {
              e.preventDefault();
              scrollToSection(sec.id);
            },
          }, sec.title())))),
      h('main', {class: 'options-main'},
        SECTIONS.map((sec) => h('section', {id: `sec-${sec.id}`, class: 'ot-section', key: sec.id},
          h(sec.comp, {settings: s, mutate, loadThemeValues}))))),
    (loading.value || bootstrapping) ? h('div', {class: 'loading-overlay'}, h(Spin, {size: 'large'})) : null,
    h(ModalHost),
    h(ToastHost));
}

const root = document.getElementById('app');
if (root) render(h(App), root);
