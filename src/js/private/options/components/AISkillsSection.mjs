// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Table, Button, Input, Textarea, Row, Col, Form, FormItem, message} from 'ant-design-vue';
import {t} from '../i18n.mjs';
import {confirmDialog} from '../ui.mjs';

export default defineComponent({
  name: 'AISkillsSection',
  props: {
    settings: {type: Object, required: true},
  },
  data() {
    return {
      newName: '',
      newDescription: '',
      newContent: '',
    };
  },
  computed: {
    columns() {
      return [
        {title: t('optionsTitleAICustomSkillsName', 'Name'), dataIndex: 'name', width: 160},
        {title: t('optionsTitleAICustomSkillsDescription2', 'Description'), dataIndex: 'description'},
        {title: '', dataIndex: 'actions', width: 110},
      ];
    },
    skills() {
      return Array.isArray(this.settings.ai_custom_skills) ? this.settings.ai_custom_skills : [];
    },
  },
  methods: {
    async confirmRemove(idx) {
      try {
        await confirmDialog({
          title: t('optionsTitleAICustomSkillsRemoveConfirm', 'Remove this skill?'),
          content: t('optionsTitleAICustomSkillsRemoveConfirm', 'Remove this skill?'),
          okText: t('optionsTitleThemeRemove', 'Remove'),
          cancelText: t('cancel', 'Cancel'),
        });
        const skills = Array.isArray(this.settings.ai_custom_skills) ? [...this.settings.ai_custom_skills] : [];
        skills.splice(idx, 1);
        this.settings.ai_custom_skills = skills;
      } catch (_e) {
        // cancelled
      }
    },
    addSkill() {
      if (!this.newName.trim() || !this.newDescription.trim() || !this.newContent.trim()) {
        message.warning(t('optionsAISkillsAddRequired', 'Name, Description and Content are required'));
        return;
      }
      const skills = Array.isArray(this.settings.ai_custom_skills) ? [...this.settings.ai_custom_skills] : [];
      const existing = skills.findIndex((s) => s.name === this.newName.trim());
      if (existing >= 0) {
        skills[existing] = {name: this.newName.trim(), description: this.newDescription.trim(), content: this.newContent.trim()};
      } else {
        skills.push({name: this.newName.trim(), description: this.newDescription.trim(), content: this.newContent.trim()});
      }
      this.settings.ai_custom_skills = skills;
      this.newName = '';
      this.newDescription = '';
      this.newContent = '';
    },
    exportSkills() {
      const json = JSON.stringify(this.skills, null, 2);
      const blob = new Blob([json], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'odooterminal_skills.json';
      link.click();
      URL.revokeObjectURL(url);
    },
    importSkills() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          let parsed;
          try {
            parsed = JSON.parse(ev.target.result);
          } catch (_) {
            return;
          }
          if (!Array.isArray(parsed)) return;
          const skills = Array.isArray(this.settings.ai_custom_skills) ? [...this.settings.ai_custom_skills] : [];
          for (const entry of parsed) {
            if (typeof entry !== 'object' || entry === null || typeof entry.name !== 'string' || !entry.name) continue;
            const existing = skills.findIndex((s) => s.name === entry.name);
            if (existing >= 0) {
              skills[existing] = {name: entry.name, description: entry.description || '', content: entry.content || ''};
            } else {
              skills.push({name: entry.name, description: entry.description || '', content: entry.content || ''});
            }
          }
          this.settings.ai_custom_skills = skills;
        };
        reader.readAsText(file);
      };
      input.click();
    },
  },
  render() {
    return h(Card, {title: t('optionsTitleAICustomSkills', 'AI Custom Skills'), class: 'ot-card'}, {
      default: () => [
        h('p', {class: 'ot-hint'}, t('optionsTitleAICustomSkillsDescription', 'Define custom skill modules available to the AI agent.')),
        h(
          Table,
          {
            dataSource: this.skills,
            columns: this.columns,
            pagination: false,
            size: 'small',
            rowKey: 'name',
            style: {marginBottom: '16px'},
          },
          {
            bodyCell: ({column, record, index}) => {
              if (column.dataIndex === 'actions') {
                return h(
                  Button,
                  {danger: true, size: 'small', onClick: () => this.confirmRemove(index)},
                  () => t('optionsTitleThemeRemove', 'Remove'),
                );
              }
              return record[column.dataIndex];
            },
          },
        ),
        h(Form, {layout: 'vertical'}, () => [
          h(Row, {gutter: 10}, () => [
            h(Col, {xs: 24, sm: 8}, () =>
              h(FormItem, {label: t('optionsTitleAICustomSkillsNameLabel', 'Name')}, () =>
                h(Input, {value: this.newName, 'onUpdate:value': (v) => { this.newName = v; }, placeholder: t('optionsTitleAICustomSkillsNamePlaceholder', 'my-skill')}),
              ),
            ),
            h(Col, {xs: 24, sm: 16}, () =>
              h(FormItem, {label: t('optionsTitleAICustomSkillsDescriptionLabel', 'Description')}, () =>
                h(Input, {value: this.newDescription, 'onUpdate:value': (v) => { this.newDescription = v; }, placeholder: t('optionsTitleAICustomSkillsDescriptionPlaceholder', 'One-line description for the AI')}),
              ),
            ),
          ]),
          h(FormItem, {label: t('optionsTitleAICustomSkillsContentLabel', 'Content')}, () =>
            h(Textarea, {value: this.newContent, 'onUpdate:value': (v) => { this.newContent = v; }, rows: 6, placeholder: t('optionsTitleAICustomSkillsContentPlaceholder', 'Write the skill content in plain text or markdown.')}),
          ),
          h('div', {class: 'ot-btn-row'}, () => [
            h(Button, {type: 'primary', onClick: this.addSkill}, () => t('optionsTitleAICustomSkillsAdd', 'Add')),
            h(Button, {onClick: this.exportSkills}, () => t('optionsTitleAICustomSkillsExport', 'Export')),
            h(Button, {onClick: this.importSkills}, () => t('optionsTitleAICustomSkillsImport', 'Import')),
          ]),
        ]),
      ],
    });
  },
});
