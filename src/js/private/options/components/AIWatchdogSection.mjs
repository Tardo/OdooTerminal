// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import {Card, Field, Select, SelectOption, Checkbox, Spin, message} from '../ui.mjs';
import {t} from '../i18n.mjs';
import listModels from '../utils/list_models.mjs';

export default function AIWatchdogSection({settings, mutate}: any) {
  const providers: Array<AIModelConfig> = Array.isArray(settings.ai_models) ? settings.ai_models : [];
  const selectedProvider: AIModelConfig | void = providers.find((p: AIModelConfig) => p.name === settings.watchdog_provider);

  const [models, setModels] = useState<Array<string>>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedProvider) {
      setModels([]);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    listModels(selectedProvider.url, selectedProvider.api_key, selectedProvider.provider, controller.signal)
      .then((list: Array<string>) => {
        if (!cancelled) setModels(list);
      })
      .catch((err: mixed) => {
        if (!cancelled) {
          setModels([]);
          const msg = err instanceof Error ? err.message : String(err);
          message.error(`${t('optionsAIWatchdogModelsLoadError', 'Could not load models')}: ${msg}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // settings.watchdog_provider drives selectedProvider; re-run whenever the picked provider's
    // connection details change.
  }, [selectedProvider?.name, selectedProvider?.url, selectedProvider?.api_key, selectedProvider?.provider]);

  return h(Card, {title: t('optionsTitleAIWatchdog', 'AI Watchdog'), class: 'ot-card'},
    h('p', {class: 'ot-hint'},
      t(
        'optionsAIWatchdogDescription',
        'A floating watchdog that reacts on its own to page activity (save/open/edit/hover/Odoo messages) with a short, read-only AI verdict — it never runs commands or changes anything. This sets the default for every Odoo instance the extension runs on; each instance can still override the model locally with the "ai watchdog" terminal command.',
      )),
    h('p', {class: 'ot-warn'},
      t(
        'optionsAIWatchdogTokenWarning',
        '⚠ High token usage: it calls the AI automatically on EVERY save, field edit, record you open, lingering hover over a button, and Odoo warning/error message — with no manual step in between. Only use it with a local model (Ollama, llama.cpp, etc.) — it is NOT recommended with a paid cloud provider, where it can run up a large bill unattended.',
      )),
    h('div', {class: 'ot-form'},
      h(Checkbox, {
        checked: Boolean(settings.watchdog_enabled),
        'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.watchdog_enabled = v; }),
      }, t('optionsAIWatchdogEnabled', 'Enabled by default')),
      h('p', {class: 'ot-tip'},
        t(
          'optionsAIWatchdogManualHint',
          'Leave this off to keep it opt-in per instance: run "ai watchdog -p on" in the terminal on any Odoo instance to turn it on just there (it will use the provider/model picked below unless overridden with "-m <model>"). Turn it off again with "ai watchdog -p off".',
        )),
      h(Field, {label: t('optionsAIWatchdogProvider', 'Provider')},
        h(Select, {
          value: settings.watchdog_provider || '',
          'onUpdate:value': (v: string) => mutate((s: any) => {
            s.watchdog_provider = v;
            s.watchdog_model = '';
          }),
          style: {width: '240px'},
        },
          h(SelectOption, {value: ''}, t('optionsAIWatchdogNoProvider', '-- No provider --')),
          providers.map((p: AIModelConfig) => h(SelectOption, {key: p.name, value: p.name}, p.name)))),
      h(Field, {label: t('optionsAIWatchdogModel', 'Model')},
        loading
          ? h(Spin, null)
          : h(Select, {
              value: settings.watchdog_model || '',
              disabled: !selectedProvider,
              'onUpdate:value': (v: string) => mutate((s: any) => { s.watchdog_model = v; }),
              style: {width: '240px'},
            },
              h(SelectOption, {value: ''}, t('optionsAIWatchdogNoModel', '-- Default model --')),
              models.map((m: string) => h(SelectOption, {key: m, value: m}, m)))),
      h(Field, {label: t('optionsAIWatchdogProfile', 'Profile')},
        h(Select, {
          value: settings.watchdog_profile || 'technical',
          'onUpdate:value': (v: string) => mutate((s: any) => { s.watchdog_profile = v; }),
          style: {width: '240px'},
        },
          h(SelectOption, {value: 'technical'}, t('optionsAIWatchdogProfileTechnical', 'Technical (default)')),
          h(SelectOption, {value: 'accounting'}, t('optionsAIWatchdogProfileAccounting', 'Accounting')),
          h(SelectOption, {value: 'sales'}, t('optionsAIWatchdogProfileSales', 'Sales')))),
      h('p', {class: 'ot-tip'},
        t(
          'optionsAIWatchdogProfileHint',
          'Changes the verdicts\' focus and vocabulary (e.g. accounting totals/taxes vs. sales/customer data). Required-field checks always apply regardless of profile. Only the Technical profile explains exceptions (RPC errors from a failed save/delete, or uncaught JS errors) — the other profiles don\'t react to them (Odoo\'s own on-screen error message is unaffected either way). Can also be overridden per instance with "ai watchdog -pf <profile>".',
        )),
      h(Field, {label: t('optionsAIWatchdogReasoning', 'Reasoning')},
        h(Select, {
          value: settings.watchdog_reasoning || '',
          'onUpdate:value': (v: string) => mutate((s: any) => { s.watchdog_reasoning = v; }),
          style: {width: '240px'},
        },
          h(SelectOption, {value: ''}, t('optionsAIWatchdogReasoningDefault', '-- Default (no override) --')),
          h(SelectOption, {value: 'off'}, t('optionsAIWatchdogReasoningOff', 'Off (skip chain-of-thought)')),
          h(SelectOption, {value: 'low'}, t('optionsAIWatchdogReasoningLow', 'Low')),
          h(SelectOption, {value: 'medium'}, t('optionsAIWatchdogReasoningMedium', 'Medium')),
          h(SelectOption, {value: 'high'}, t('optionsAIWatchdogReasoningHigh', 'High')))),
      h('p', {class: 'ot-tip'},
        t(
          'optionsAIWatchdogReasoningHint',
          'If the watchdog sometimes shows nothing, your model may be a "thinking" model spending its whole reply on internal reasoning — try "Off". Only applies to OpenAI-compatible servers (local llama.cpp/vLLM/Ollama, etc.); can also be overridden per instance with "ai watchdog -r <level>".',
        )),
      h('p', {class: 'ot-tip'},
        t(
          'optionsAIWatchdogHint',
          'No local server configured yet? Add one under the "AI Providers" tab, then pick it here.',
        ))));
}
