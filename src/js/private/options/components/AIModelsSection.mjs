// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import {Card, Field, Input, InputNumber, Select, SelectOption, Table, Button, Tag, Row, Col, message, confirmDialog} from '../ui.mjs';
import {t} from '../i18n.mjs';
import {hasHostPermission, requestHostPermission} from '@shared/host_permissions';

const PROVIDER_DEFAULT_URLS: {[string]: string} = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
};

export default function AIModelsSection({settings, mutate}: any) {
  const [newName, setNewName] = useState<string>('');
  const [newProvider, setNewProvider] = useState<string>('openai');
  const [newUrl, setNewUrl] = useState<string>(PROVIDER_DEFAULT_URLS.openai);
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [newTimeout, setNewTimeout] = useState<number>(900);
  const [newMaxTokens, setNewMaxTokens] = useState<number>(0);
  const [grantedUrls, setGrantedUrls] = useState<Array<string>>([]);

  const models = Array.isArray(settings.ai_models) ? settings.ai_models : [];
  const columns = [
    {title: t('optionsTitleAIModelsName', 'Name'), dataIndex: 'name'},
    {title: t('optionsTitleAIModelsProvider', 'Provider'), dataIndex: 'provider', width: 110},
    {title: t('optionsTitleAIModelsMaxTokens', 'Max tokens'), dataIndex: 'max_tokens', width: 110},
    {title: '', dataIndex: 'actions', width: 200},
  ];

  const refreshAllGrantStates = async () => {
    const all = Array.isArray(settings.ai_models) ? settings.ai_models : [];
    const urls = new Set<string>();
    all.forEach((m: any) => {
      if (m.url) urls.add(m.url);
    });
    if (newUrl) urls.add(newUrl);
    const results: any = await Promise.all(
      [...urls].map(async (url) => [url, Boolean(await hasHostPermission(url))]),
    );
    setGrantedUrls(results.filter((r: any) => r[1]).map((r: any) => r[0]));
  };

  const checkNewUrlGrant = async () => {
    if (!newUrl) return;
    const granted = Boolean(await hasHostPermission(newUrl));
    setGrantedUrls((prev) => {
      if (granted && prev.indexOf(newUrl) === -1) return [...prev, newUrl];
      if (!granted) return prev.filter((u) => u !== newUrl);
      return prev;
    });
  };

  const grantAccess = async (url: string) => {
    if (!url) {
      message.warning(t('optionsAIModelsLoadMissingURL', 'Enter URL first'));
      return;
    }
    try {
      const granted = await requestHostPermission(url);
      setGrantedUrls((prev) => {
        if (granted && prev.indexOf(url) === -1) return [...prev, url];
        if (!granted) return prev.filter((u) => u !== url);
        return prev;
      });
      if (granted) message.success(t('optionsAIModelsGrantSuccess', 'Access granted'));
      else message.warning(t('optionsAIModelsGrantDenied', 'Access denied'));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      message.error(`${t('optionsAIModelsGrantError', 'Error granting access')}: ${errMsg}`);
    }
  };

  const onProviderChange = (val: string) => {
    setNewProvider(val);
    const defaultUrl = PROVIDER_DEFAULT_URLS[val];
    if (defaultUrl && (!newUrl || Object.values(PROVIDER_DEFAULT_URLS).indexOf(newUrl) !== -1)) {
      setNewUrl(defaultUrl);
    }
  };

  const addModel = () => {
    if (!newName || !newUrl) {
      message.warning(t('optionsAIModelsAddRequired', 'Name and URL are required'));
      return;
    }
    const entry = {
      name: newName,
      url: newUrl,
      api_key: newApiKey,
      provider: newProvider,
      timeout: newTimeout || 900,
      max_tokens: newMaxTokens || 0,
    };
    mutate((s: any) => {
      const arr = Array.isArray(s.ai_models) ? [...s.ai_models] : [];
      arr.push(entry);
      s.ai_models = arr;
    });
    setNewName('');
    setNewApiKey('');
    setNewTimeout(900);
    setNewMaxTokens(0);
  };

  const confirmRemoveModel = async (idx: number) => {
    const ok = await confirmDialog({
      title: t('optionsTitleAIModelsRemove', 'Remove provider?'),
      content: t('optionsTitleAIModelsRemoveConfirm', 'Remove this AI provider connection?'),
      okText: t('optionsTitleThemeRemove', 'Remove'),
      cancelText: t('cancel', 'Cancel'),
    });
    if (!ok) return;
    mutate((s: any) => {
      const arr = Array.isArray(s.ai_models) ? [...s.ai_models] : [];
      arr.splice(idx, 1);
      s.ai_models = arr;
    });
  };

  useEffect(() => {
    refreshAllGrantStates();
  }, [settings.ai_models]);
  useEffect(() => {
    checkNewUrlGrant();
  }, [newUrl]);

  const newUrlGranted = grantedUrls.indexOf(newUrl) !== -1;

  return h(Card, {title: t('optionsTitleAIModels', 'AI Providers'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleAIModelsDescription', 'Define AI provider connections to use in AI mode. The model is picked from AI mode itself, below the provider selector.')),
    h('p', {class: 'ot-warn'}, t('optionsWarningAIModelsKeys', 'Warning: API keys are stored in browser storage.')),
    h('p', {class: 'ot-tip'}, t('optionsTipAIModelsCapabilities', 'Tip: Pick a model that supports tool use, vision, and extended thinking when selecting it in AI mode.')),
    h(Table, {
      dataSource: models,
      columns,
      size: 'small',
      rowKey: 'name',
      style: {marginBottom: '16px'},
      bodyCell: ({column, record, index}: any) => {
        if (column.dataIndex === 'max_tokens') {
          return h('span', null, record.max_tokens > 0 ? String(record.max_tokens) : '-');
        }
        if (column.dataIndex === 'actions') {
          const granted = grantedUrls.indexOf(record.url) !== -1;
          return h('div', {class: 'ot-btn-row'},
            granted
              ? h(Tag, {color: 'green'}, `✓ ${t('optionsAIModelsGrantedLabel', 'Access granted')}`)
              : h(Button, {size: 'small', onClick: () => grantAccess(record.url)}, t('optionsTitleAIModelsGrant', 'Grant access')),
            h(Button, {danger: true, size: 'small', onClick: () => confirmRemoveModel(index)}, t('optionsTitleThemeRemove', 'Remove')));
        }
        return record[column.dataIndex];
      },
    }),
    h('div', {class: 'ot-form'},
      h(Row, {gutter: [10, 0]},
        h(Col, {flex: '1 1 160px'},
          h(Field, {label: t('optionsTitleAIModelsName', 'Name')},
            h(Input, {value: newName, 'onUpdate:value': (v: string) => setNewName(v), placeholder: t('optionsTitleAIModelsNamePlaceholder', 'My Provider')}))),
        h(Col, {flex: '1 1 140px'},
          h(Field, {label: t('optionsTitleAIModelsProvider', 'Provider')},
            h(Select, {value: newProvider, 'onUpdate:value': onProviderChange, style: {width: '100%'}},
              h(SelectOption, {value: 'openai'}, 'OpenAI'),
              h(SelectOption, {value: 'anthropic'}, 'Anthropic')))),
        h(Col, {flex: '1 1 200px'},
          h(Field, {label: 'URL'},
            h(Input, {value: newUrl, 'onUpdate:value': (v: string) => setNewUrl(v), placeholder: 'https://api.openai.com/v1'}))),
        h(Col, {flex: '1 1 160px'},
          h(Field, {label: t('optionsTitleAIModelsAPIKey', 'API Key')},
            h(Input, {type: 'password', value: newApiKey, 'onUpdate:value': (v: string) => setNewApiKey(v), placeholder: 'sk-...'}))),
        h(Col, {flex: '0 0 auto'},
          h(Field, {label: t('optionsTitleAIModelsAdd', 'Actions')},
            h('div', {class: 'ot-btn-row'},
              h(Button, {type: 'primary', onClick: addModel}, t('optionsTitleAIModelsAdd', 'Add')),
              !newUrlGranted && h(Button, {onClick: () => grantAccess(newUrl)}, t('optionsTitleAIModelsGrant', 'Grant access'))))))),
    h('details', {class: 'ot-collapse', style: {marginBottom: '16px'}},
      h('summary', {class: 'ot-collapse-header'}, t('optionsTitleAIModelsAdvanced', 'Advanced options')),
      h('div', {class: 'ot-form ot-collapse-body'},
        h(Row, {gutter: 10},
          h(Col, {flex: '1'},
            h(Field, {label: t('optionsTitleAIModelsTimeout', 'Timeout (s)')},
              h(InputNumber, {value: newTimeout, 'onUpdate:value': (v: number) => setNewTimeout(v), min: 0, style: {width: '100%'}}))),
          h(Col, {flex: '1'},
            h(Field, {label: t('optionsTitleAIModelsMaxTokensLabel', 'Max tokens (0 = default)')},
              h(InputNumber, {value: newMaxTokens, 'onUpdate:value': (v: number) => setNewMaxTokens(v), min: 0, style: {width: '100%'}})))))));
}
