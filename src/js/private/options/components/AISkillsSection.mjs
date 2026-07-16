// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState} from 'preact/hooks';
import {Card, Table, Button, Input, Textarea, Row, Col, Field, message, confirmDialog} from '../ui.mjs';
import {t} from '../i18n.mjs';

export default function AISkillsSection({settings, mutate}: any) {
  const [newName, setNewName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');

  const skills = Array.isArray(settings.ai_custom_skills) ? settings.ai_custom_skills : [];
  const columns = [
    {title: t('optionsTitleAICustomSkillsName', 'Name'), dataIndex: 'name', width: 160},
    {title: t('optionsTitleAICustomSkillsDescription2', 'Description'), dataIndex: 'description'},
    {title: '', dataIndex: 'actions', width: 110},
  ];

  const confirmRemove = async (idx: number) => {
    const ok = await confirmDialog({
      title: t('optionsTitleAICustomSkillsRemoveConfirm', 'Remove this skill?'),
      content: t('optionsTitleAICustomSkillsRemoveConfirm', 'Remove this skill?'),
      okText: t('optionsTitleThemeRemove', 'Remove'),
      cancelText: t('cancel', 'Cancel'),
    });
    if (!ok) return;
    mutate((s: any) => {
      const arr = Array.isArray(s.ai_custom_skills) ? [...s.ai_custom_skills] : [];
      arr.splice(idx, 1);
      s.ai_custom_skills = arr;
    });
  };

  const addSkill = () => {
    if (!newName.trim() || !newDescription.trim() || !newContent.trim()) {
      message.warning(t('optionsAISkillsAddRequired', 'Name, Description and Content are required'));
      return;
    }
    const entry = {name: newName.trim(), description: newDescription.trim(), content: newContent.trim()};
    mutate((s: any) => {
      const arr = Array.isArray(s.ai_custom_skills) ? [...s.ai_custom_skills] : [];
      const existing = arr.findIndex((x: any) => x.name === entry.name);
      if (existing >= 0) arr[existing] = entry;
      else arr.push(entry);
      s.ai_custom_skills = arr;
    });
    setNewName('');
    setNewDescription('');
    setNewContent('');
  };

  const exportSkills = () => {
    const json = JSON.stringify(skills, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'odooterminal_skills.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSkills = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const target = e.target;
      const file = target instanceof HTMLInputElement ? target.files && target.files[0] : null;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        const result = ev.target && ev.target.result;
        let parsed;
        try {
          parsed = JSON.parse(typeof result === 'string' ? result : '');
        } catch (_) {
          return;
        }
        if (!Array.isArray(parsed)) return;
        mutate((s: any) => {
          const arr = Array.isArray(s.ai_custom_skills) ? [...s.ai_custom_skills] : [];
          for (const entry of parsed) {
            if (typeof entry !== 'object' || entry === null || typeof entry.name !== 'string' || !entry.name) continue;
            const e2 = {name: entry.name, description: entry.description || '', content: entry.content || ''};
            const existing = arr.findIndex((x: any) => x.name === entry.name);
            if (existing >= 0) arr[existing] = e2;
            else arr.push(e2);
          }
          s.ai_custom_skills = arr;
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return h(Card, {title: t('optionsTitleAICustomSkills', 'AI Custom Skills'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleAICustomSkillsDescription', 'Define custom skill modules available to the AI agent.')),
    h(Table, {
      dataSource: skills,
      columns,
      size: 'small',
      rowKey: 'name',
      style: {marginBottom: '16px'},
      bodyCell: ({column, record, index}: any) => {
        if (column.dataIndex === 'actions') {
          return h(Button, {danger: true, size: 'small', onClick: () => confirmRemove(index)}, t('optionsTitleThemeRemove', 'Remove'));
        }
        return record[column.dataIndex];
      },
    }),
    h('div', {class: 'ot-form'},
      h(Row, {gutter: 10},
        h(Col, {flex: '1 1 160px'},
          h(Field, {label: t('optionsTitleAICustomSkillsNameLabel', 'Name')},
            h(Input, {value: newName, 'onUpdate:value': (v: string) => setNewName(v), placeholder: t('optionsTitleAICustomSkillsNamePlaceholder', 'my-skill')}))),
        h(Col, {flex: '2 1 320px'},
          h(Field, {label: t('optionsTitleAICustomSkillsDescriptionLabel', 'Description')},
            h(Input, {value: newDescription, 'onUpdate:value': (v: string) => setNewDescription(v), placeholder: t('optionsTitleAICustomSkillsDescriptionPlaceholder', 'One-line description for the AI')})))),
      h(Field, {label: t('optionsTitleAICustomSkillsContentLabel', 'Content')},
        h(Textarea, {value: newContent, 'onUpdate:value': (v: string) => setNewContent(v), rows: 6, placeholder: t('optionsTitleAICustomSkillsContentPlaceholder', 'Write the skill content in plain text or markdown.')})),
      h('div', {class: 'ot-btn-row'},
        h(Button, {type: 'primary', onClick: addSkill}, t('optionsTitleAICustomSkillsAdd', 'Add')),
        h(Button, {onClick: exportSkills}, t('optionsTitleAICustomSkillsExport', 'Export')),
        h(Button, {onClick: importSkills}, t('optionsTitleAICustomSkillsImport', 'Import')))));
}
