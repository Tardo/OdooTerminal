// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState, useEffect} from 'preact/hooks';
import {Card, Field, Input, InputNumber, Switch, Table, Button, Tag, Row, Col, message, confirmDialog} from '../ui.mjs';
import {t} from '../i18n.mjs';
import {hasHostPermission, requestHostPermission} from '@shared/host_permissions';

export default function MCPServersSection({settings, mutate}: any) {
  const [newName, setNewName] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [newTimeout, setNewTimeout] = useState<number>(30);
  const [newEnabled, setNewEnabled] = useState<boolean>(true);
  const [grantedUrls, setGrantedUrls] = useState<Array<string>>([]);

  const servers = Array.isArray(settings.mcp_servers) ? settings.mcp_servers : [];
  const columns = [
    {title: t('optionsTitleMCPServersName', 'Name'), dataIndex: 'name'},
    {title: t('optionsTitleMCPServersUrl', 'URL'), dataIndex: 'url'},
    {title: t('optionsTitleMCPServersEnabled', 'Enabled'), dataIndex: 'enabled', width: 90},
    {title: '', dataIndex: 'actions', width: 200},
  ];

  const refreshAllGrantStates = async () => {
    const all = Array.isArray(settings.mcp_servers) ? settings.mcp_servers : [];
    const urls = new Set<string>();
    all.forEach((s: any) => {
      if (s.url) urls.add(s.url);
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

  const addServer = () => {
    if (!newName || !newUrl) {
      message.warning(t('optionsMCPServersAddRequired', 'Name and URL are required'));
      return;
    }
    const entry = {
      name: newName,
      url: newUrl,
      api_key: newApiKey,
      timeout: newTimeout || 30,
      enabled: newEnabled,
    };
    mutate((s: any) => {
      const arr = Array.isArray(s.mcp_servers) ? [...s.mcp_servers] : [];
      arr.push(entry);
      s.mcp_servers = arr;
    });
    setNewName('');
    setNewUrl('');
    setNewApiKey('');
    setNewTimeout(30);
    setNewEnabled(true);
  };

  const toggleServerEnabled = (index: number, enabled: boolean) => {
    mutate((s: any) => {
      const arr = Array.isArray(s.mcp_servers) ? [...s.mcp_servers] : [];
      arr[index] = {...arr[index], enabled};
      s.mcp_servers = arr;
    });
  };

  const confirmRemoveServer = async (idx: number) => {
    const ok = await confirmDialog({
      title: t('optionsTitleMCPServersRemove', 'Remove server?'),
      content: t('optionsTitleMCPServersRemoveConfirm', 'Remove this MCP server connection?'),
      okText: t('optionsTitleThemeRemove', 'Remove'),
      cancelText: t('cancel', 'Cancel'),
    });
    if (!ok) return;
    mutate((s: any) => {
      const arr = Array.isArray(s.mcp_servers) ? [...s.mcp_servers] : [];
      arr.splice(idx, 1);
      s.mcp_servers = arr;
    });
  };

  useEffect(() => {
    refreshAllGrantStates();
  }, [settings.mcp_servers]);
  useEffect(() => {
    checkNewUrlGrant();
  }, [newUrl]);

  const newUrlGranted = grantedUrls.indexOf(newUrl) !== -1;

  return h(Card, {title: t('optionsTitleMCPServers', 'MCP Servers'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleMCPServersDescription', 'Connect the AI agent to remote MCP (Model Context Protocol) servers. Tools exposed by enabled servers are offered to the agent alongside its built-in tools.')),
    h('p', {class: 'ot-warn'}, t('optionsWarningAIModelsKeys', 'Warning: API keys are stored in browser storage.')),
    h('p', {class: 'ot-tip'}, t('optionsTipMCPServersScope', 'Tip: MCP tools are only available in "ai agent", not "ai chat". The agent asks for permission once per server per conversation.')),
    h(Table, {
      dataSource: servers,
      columns,
      size: 'small',
      rowKey: 'name',
      style: {marginBottom: '16px'},
      bodyCell: ({column, record, index}: any) => {
        if (column.dataIndex === 'enabled') {
          return h(Switch, {checked: record.enabled, 'onUpdate:checked': (v: boolean) => toggleServerEnabled(index, v)});
        }
        if (column.dataIndex === 'actions') {
          const granted = grantedUrls.indexOf(record.url) !== -1;
          return h('div', {class: 'ot-btn-row'},
            granted
              ? h(Tag, {color: 'green'}, `✓ ${t('optionsAIModelsGrantedLabel', 'Access granted')}`)
              : h(Button, {size: 'small', onClick: () => grantAccess(record.url)}, t('optionsTitleAIModelsGrant', 'Grant access')),
            h(Button, {danger: true, size: 'small', onClick: () => confirmRemoveServer(index)}, t('optionsTitleThemeRemove', 'Remove')));
        }
        return record[column.dataIndex];
      },
    }),
    h('div', {class: 'ot-form'},
      h(Row, {gutter: [10, 0]},
        h(Col, {flex: '1 1 160px'},
          h(Field, {label: t('optionsTitleMCPServersName', 'Name')},
            h(Input, {value: newName, 'onUpdate:value': (v: string) => setNewName(v), placeholder: t('optionsTitleMCPServersNamePlaceholder', 'My MCP Server')}))),
        h(Col, {flex: '1 1 220px'},
          h(Field, {label: t('optionsTitleMCPServersUrl', 'URL')},
            h(Input, {value: newUrl, 'onUpdate:value': (v: string) => setNewUrl(v), placeholder: 'https://example.com/mcp'}))),
        h(Col, {flex: '1 1 160px'},
          h(Field, {label: t('optionsTitleAIModelsAPIKey', 'API Key')},
            h(Input, {type: 'password', value: newApiKey, 'onUpdate:value': (v: string) => setNewApiKey(v), placeholder: 'optional'}))),
        h(Col, {flex: '0 0 auto'},
          h(Field, {label: t('optionsTitleMCPServersEnabled', 'Enabled')},
            h(Switch, {checked: newEnabled, 'onUpdate:checked': (v: boolean) => setNewEnabled(v)}))),
        h(Col, {flex: '0 0 auto'},
          h(Field, {label: t('optionsTitleMCPServersAdd', 'Actions')},
            h('div', {class: 'ot-btn-row'},
              h(Button, {type: 'primary', onClick: addServer}, t('optionsTitleMCPServersAdd', 'Add')),
              !newUrlGranted && h(Button, {onClick: () => grantAccess(newUrl)}, t('optionsTitleAIModelsGrant', 'Grant access'))))))),
    h('details', {class: 'ot-collapse', style: {marginBottom: '16px'}},
      h('summary', {class: 'ot-collapse-header'}, t('optionsTitleAIModelsAdvanced', 'Advanced options')),
      h('div', {class: 'ot-form ot-collapse-body'},
        h(Row, {gutter: 10},
          h(Col, {flex: '1'},
            h(Field, {label: t('optionsTitleAIModelsTimeout', 'Timeout (s)')},
              h(InputNumber, {value: newTimeout, 'onUpdate:value': (v: number) => setNewTimeout(v), min: 0, style: {width: '100%'}})))))));
}
