// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {createApp, defineComponent, ref, onMounted, h} from 'vue';
import {Button as AButton, Tag as ATag, Spin as ASpin, Anchor as AAnchor, AnchorLink as AAnchorLink, ConfigProvider as AConfigProvider, message} from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import esES from 'ant-design-vue/es/locale/es_ES';

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
import {confirmDialog} from './ui.mjs';

type SectionDef = {
  id: string,
  title: () => string,
  comp: any,
};

const SECTIONS: Array<SectionDef> = [
  {id: 'behaviour', title: () => t('optionsTitleBehaviour', 'Behaviour'), comp: BehaviourSection},
  {id: 'theme', title: () => t('optionsTitleTheme', 'Theme'), comp: ThemeSection},
  {id: 'shortcuts', title: () => t('optionsTitleShortcuts', 'Shortcuts'), comp: ShortcutsSection},
  {id: 'command-assistant', title: () => t('optionsTitleCommandAssistant', 'Command Assistant'), comp: CommandAssistantSection},
  {id: 'ai-models', title: () => t('optionsTitleAIModels', 'AI Models'), comp: AIModelsSection},
  {id: 'ai-skills', title: () => t('optionsTitleAICustomSkills', 'AI Skills'), comp: AISkillsSection},
  {id: 'init-commands', title: () => t('optionsTitleInitCommands', 'Init Commands'), comp: InitCommandsSection},
  {id: 'terminal-context', title: () => t('optionsTitleTerminalContext', 'Terminal Context'), comp: TerminalContextSection},
  {id: 'developer-zone', title: () => t('optionsTitleDeveloperZone', 'Developer Zone'), comp: DeveloperZoneSection},
  {id: 'misc', title: () => t('optionsTitleMisc', 'Misc'), comp: MiscSection},
];

// antdv 组件自带文案（Table 的 "No data"、分页等）通过 ConfigProvider 本地化，
// 跟随用户的 language 设置切换。
const ANTDV_LOCALES = {zh: zhCN, es: esES};
function antdvLocaleFor(lang) {
  if (!lang || lang === 'auto') {
    const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
    return ANTDV_LOCALES[nav.split('-')[0]];
  }
  return ANTDV_LOCALES[lang];
}

const App = defineComponent({
  name: 'App',
  setup() {
    const {settings, loading, saveSettings, resetSettings, hasChanges, load, loadThemeValues, checkChanges} = useSettings();
    const saving = ref(false);
    const bootstrapping = ref(true);

    onMounted(async () => {
      document.title = 'OdooTerminal — ' + t('optionsSubtitle', 'Settings & Configuration');
      await load();
      await initI18n(settings.language);
      document.title = 'OdooTerminal — ' + t('optionsSubtitle', 'Settings & Configuration');
      bootstrapping.value = false;
      setInterval(checkChanges, 500);
    });

    const handleSave = async () => {
      saving.value = true;
      try {
        await saveSettings();
        message.success(t('optionsSaved', 'Settings saved successfully'));
      } catch (_err) {
        message.error(t('optionsSaveFailed', 'Failed to save settings'));
      } finally {
        saving.value = false;
      }
    };

    const handleReset = async () => {
      try {
        await confirmDialog({
          title: t('optionsReset', 'Reset to Defaults'),
          content: t('optionsResetConfirm', 'This will reset all settings to their default values. Are you sure?'),
          okText: t('optionsReset', 'Reset to Defaults'),
          cancelText: t('cancel', 'Cancel'),
        });
        await resetSettings();
        message.success(t('optionsResetDone', 'Settings have been reset to defaults'));
      } catch (_e) {
        // cancelled
      }
    };

    return () =>
      h(AConfigProvider, {locale: antdvLocaleFor(settings.language)}, () =>
        h('div', {class: 'options-app'}, [
          // Header
          h('header', {class: 'options-header'}, [
            h('div', {class: 'header-brand'}, [
              h('div', {class: 'brand-icon'}, [h('span', {class: 'brand-icon-text'}, '>_')]),
              h('div', {class: 'brand-text'}, [
                h('h1', {class: 'brand-title'}, 'OdooTerminal'),
                h('p', {class: 'brand-subtitle'}, t('optionsSubtitle', 'Settings & Configuration')),
              ]),
            ]),
            h('div', {class: 'header-actions'}, [
              hasChanges.value
                ? h(ATag, {color: 'orange'}, () => t('optionsUnsavedChanges', 'Unsaved changes'))
                : h(ATag, {color: 'blue'}, () => t('optionsNoChanges', 'All changes saved')),
              h(AButton, {onClick: handleReset, disabled: saving.value}, () => t('optionsReset', 'Reset to Defaults')),
              h(
                AButton,
                {type: 'primary', onClick: handleSave, loading: saving.value, disabled: !hasChanges.value},
                () => t('optionsSave', 'Save Settings'),
              ),
            ]),
          ]),

          // Body: sticky anchor sidebar + scrollable sections
          h('div', {class: 'options-body'}, [
            h('aside', {class: 'options-sidenav'}, [
              h(
                AAnchor,
                {affix: false, offsetTop: 80, showInkInFixed: true, bounds: 80},
                () => SECTIONS.map((s) => h(AAnchorLink, {href: `#sec-${s.id}`, title: s.title()})),
              ),
            ]),
            h('main', {class: 'options-main'}, () =>
              SECTIONS.map((s) =>
                h('section', {id: `sec-${s.id}`, class: 'ot-section'}, [h(s.comp, {settings, loadThemeValues})]),
              ),
            ),
          ]),

          // Loading Overlay
          loading.value || bootstrapping.value ? h('div', {class: 'loading-overlay'}, [h(ASpin, {size: 'large'})]) : null,
        ]),
      );
  },
});

const app = createApp(App);
app.mount('#app');
