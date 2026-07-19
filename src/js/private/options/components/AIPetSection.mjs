// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import {Card, Field, Select, SelectOption, Checkbox, Spin, message} from '../ui.mjs';
import {t} from '../i18n.mjs';
import listModels from '../utils/list_models.mjs';

export default function AIPetSection({settings, mutate}: any) {
  const providers: Array<AIModelConfig> = Array.isArray(settings.ai_models) ? settings.ai_models : [];
  const selectedProvider: AIModelConfig | void = providers.find((p: AIModelConfig) => p.name === settings.pet_provider);

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
          message.error(`${t('optionsAIPetModelsLoadError', 'Could not load models')}: ${msg}`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // settings.pet_provider drives selectedProvider; re-run whenever the picked provider's
    // connection details change.
  }, [selectedProvider?.name, selectedProvider?.url, selectedProvider?.api_key, selectedProvider?.provider]);

  return h(Card, {title: t('optionsTitleAIPet', 'Guardian Pet'), class: 'ot-card'},
    h('p', {class: 'ot-hint'},
      t(
        'optionsAIPetDescription',
        'A floating guardian that reacts on its own to page activity (save/open) with a short, read-only AI verdict — it never runs commands or changes anything. This sets the default for every Odoo instance the extension runs on; each instance can still override the model locally with the "ai pet" terminal command.',
      )),
    h('p', {class: 'ot-warn'},
      t(
        'optionsAIPetTokenWarning',
        '⚠ High token usage: it calls the AI automatically on EVERY save and every record you open, with no manual step in between. Only use it with a local model (Ollama, llama.cpp, etc.) — it is NOT recommended with a paid cloud provider, where it can run up a large bill unattended.',
      )),
    h('div', {class: 'ot-form'},
      h(Checkbox, {
        checked: Boolean(settings.pet_enabled),
        'onUpdate:checked': (v: boolean) => mutate((s: any) => { s.pet_enabled = v; }),
      }, t('optionsAIPetEnabled', 'Enabled by default')),
      h('p', {class: 'ot-tip'},
        t(
          'optionsAIPetManualHint',
          'Leave this off to keep it opt-in per instance: run "ai pet -p on" in the terminal on any Odoo instance to turn it on just there (it will use the provider/model picked below unless overridden with "-m <model>"). Turn it off again with "ai pet -p off".',
        )),
      h(Field, {label: t('optionsAIPetProvider', 'Provider')},
        h(Select, {
          value: settings.pet_provider || '',
          'onUpdate:value': (v: string) => mutate((s: any) => {
            s.pet_provider = v;
            s.pet_model = '';
          }),
          style: {width: '240px'},
        },
          h(SelectOption, {value: ''}, t('optionsAIPetNoProvider', '-- No provider --')),
          providers.map((p: AIModelConfig) => h(SelectOption, {key: p.name, value: p.name}, p.name)))),
      h(Field, {label: t('optionsAIPetModel', 'Model')},
        loading
          ? h(Spin, null)
          : h(Select, {
              value: settings.pet_model || '',
              disabled: !selectedProvider,
              'onUpdate:value': (v: string) => mutate((s: any) => { s.pet_model = v; }),
              style: {width: '240px'},
            },
              h(SelectOption, {value: ''}, t('optionsAIPetNoModel', '-- Default model --')),
              models.map((m: string) => h(SelectOption, {key: m, value: m}, m)))),
      h(Field, {label: t('optionsAIPetReasoning', 'Reasoning')},
        h(Select, {
          value: settings.pet_reasoning || '',
          'onUpdate:value': (v: string) => mutate((s: any) => { s.pet_reasoning = v; }),
          style: {width: '240px'},
        },
          h(SelectOption, {value: ''}, t('optionsAIPetReasoningDefault', '-- Default (no override) --')),
          h(SelectOption, {value: 'off'}, t('optionsAIPetReasoningOff', 'Off (skip chain-of-thought)')),
          h(SelectOption, {value: 'low'}, t('optionsAIPetReasoningLow', 'Low')),
          h(SelectOption, {value: 'medium'}, t('optionsAIPetReasoningMedium', 'Medium')),
          h(SelectOption, {value: 'high'}, t('optionsAIPetReasoningHigh', 'High')))),
      h('p', {class: 'ot-tip'},
        t(
          'optionsAIPetReasoningHint',
          'If the pet sometimes shows nothing, your model may be a "thinking" model spending its whole reply on internal reasoning — try "Off". Only applies to OpenAI-compatible servers (local llama.cpp/vLLM/Ollama, etc.); can also be overridden per instance with "ai pet -r <level>".',
        )),
      h('p', {class: 'ot-tip'},
        t(
          'optionsAIPetHint',
          'No local server configured yet? Add one under the "AI Providers" tab, then pick it here.',
        ))));
}
