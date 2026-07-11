// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
// $FlowFixMe[object-this-reference]
import {defineComponent, h} from 'vue';
import {Card, Form, FormItem, Select, SelectOption, Slider, InputNumber, Input, Divider, Table, Button, Row, Col} from 'ant-design-vue';
import {THEMES} from '@common/constants';
import {t} from '../i18n.mjs';
import {ColorInput} from '../ui.mjs';

export default defineComponent({
  name: 'ThemeSection',
  props: {
    settings: {type: Object, required: true},
    loadThemeValues: {type: Function, required: true},
  },
  data() {
    return {
      newDomain: '',
      newColor: '#ff0000',
    };
  },
  computed: {
    domainColumns() {
      return [
        {title: t('optionsTitleThemeDomain', 'Domain'), dataIndex: 'domain'},
        {title: t('optionsTitleThemeColor', 'Color'), dataIndex: 'color'},
        {title: '', dataIndex: 'actions', width: 120},
      ];
    },
    colorDomain() {
      const domains = this.settings.colors_domain || {};
      return Object.entries(domains).map(([domain, color]) => ({domain, color}));
    },
  },
  methods: {
    async onThemeChange(val) {
      this.settings.theme_preset = val;
      if (!val) return;
      try {
        const themeValues = await this.loadThemeValues(val);
        Object.assign(this.settings, themeValues);
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    },
    addDomain() {
      if (!this.newDomain || !this.newColor) return;
      this.settings.colors_domain = {...(this.settings.colors_domain || {}), [this.newDomain]: this.newColor};
      this.newDomain = '';
    },
    removeDomain(domain) {
      const domains = {...(this.settings.colors_domain || {})};
      delete domains[domain];
      this.settings.colors_domain = domains;
    },
    colorField(key) {
      return h(ColorInput, {modelValue: this.settings[key], 'onUpdate:modelValue': (v) => { this.settings[key] = v; }});
    },
  },
  render() {
    const s = this.settings;
    const themeLabels = {
      dark: t('optionsThemePresetDark', 'Dark'),
      light: t('optionsThemePresetLight', 'Light'),
      odoo: t('optionsThemePresetOdoo', 'Odoo'),
      matrix: t('optionsThemePresetMatrix', 'Matrix'),
      hacker: t('optionsThemePresetHacker', 'Hacker'),
      tech: t('optionsThemePresetTech', 'Tech'),
    };
    return h(Card, {title: t('optionsTitleTheme', 'Theme'), class: 'ot-card'}, {
      default: () =>
        h(Form, {layout: 'vertical'}, () => [
          h(Row, {gutter: 16}, () => [
            h(
              Col,
              {xs: 24, sm: 12},
              () =>
                h(FormItem, {label: t('optionsTitleThemePreset', 'Theme Preset')}, () =>
                  h(
                    Select,
                    {value: s.theme_preset, onChange: (v) => this.onThemeChange(v), style: {width: '240px'}, placeholder: t('optionsTitleThemePresetNone', 'None')},
                    () => [
                      h(SelectOption, {value: ''}, () => t('optionsTitleThemePresetNone', 'None')),
                      ...THEMES.map((item) => h(SelectOption, {key: item[0], value: item[0]}, () => themeLabels[item[0]] || item[1])),
                    ],
                  ),
                ),
            ),
            h(
              Col,
              {xs: 24, sm: 12},
              () =>
                h(FormItem, {label: t('optionsTitleThemeOpacity', 'Opacity')}, () =>
                  h(Row, {gutter: 8}, () => [
                    h(Col, {flex: 'auto'}, () =>
                      h(Slider, {value: s.opacity, 'onUpdate:value': (v) => { s.opacity = v; }, min: 0, max: 100}),
                    ),
                    h(Col, {flex: '90px'}, () =>
                      h(InputNumber, {value: s.opacity, 'onUpdate:value': (v) => { s.opacity = v; }, min: 0, max: 100, style: {width: '100%'}}),
                    ),
                  ]),
                ),
            ),
          ]),
          h(Row, {gutter: 16}, () => [
            h(
              Col,
              {xs: 24, sm: 12},
              () =>
                h(FormItem, {label: t('optionsTitleThemeFontSize', 'Font Size')}, () =>
                  h(
                    Select,
                    {value: s.fontsize, 'onUpdate:value': (v) => { s.fontsize = v; }, style: {width: '240px'}},
                    () => [
                      h(SelectOption, {value: 'small'}, () => t('optionsTitleThemeFontSizeSmall', 'Small')),
                      h(SelectOption, {value: 'medium'}, () => t('optionsTitleThemeFontSizeMedium', 'Medium')),
                      h(SelectOption, {value: 'large'}, () => t('optionsTitleThemeFontSizeLarge', 'Large')),
                    ],
                  ),
                ),
            ),
            h(
              Col,
              {xs: 24, sm: 12},
              () =>
                h(FormItem, {label: t('optionsTitleThemeFontSizeCA', 'Font Size (CA)')}, () =>
                  h(
                    Select,
                    {value: s.fontsize_ca, 'onUpdate:value': (v) => { s.fontsize_ca = v; }, style: {width: '240px'}},
                    () => [
                      h(SelectOption, {value: 'x-small'}, () => t('optionsTitleThemeFontSizeXSmall', 'X-Small')),
                      h(SelectOption, {value: 'small'}, () => t('optionsTitleThemeFontSizeSmall', 'Small')),
                      h(SelectOption, {value: 'medium'}, () => t('optionsTitleThemeFontSizeMedium', 'Medium')),
                      h(SelectOption, {value: 'large'}, () => t('optionsTitleThemeFontSizeLarge', 'Large')),
                    ],
                  ),
                ),
            ),
          ]),
          h(FormItem, {label: t('optionsTitleThemeFontFamily', 'Font Family')}, () =>
            h(Input, {value: s.fontfamily, 'onUpdate:value': (v) => { s.fontfamily = v; }, placeholder: "'Lucida Console', Monaco, monospace"}),
          ),
          h(Divider, {orientation: 'left'}, () => t('optionsTitleThemeColors', 'Colors')),
          h(Row, {gutter: [16, 8]}, () => [
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorPrimary', 'Primary')}, () => this.colorField('color_primary'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorSecondary', 'Secondary')}, () => this.colorField('color_secondary'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorSuccess', 'Success')}, () => this.colorField('color_success'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorDanger', 'Danger')}, () => this.colorField('color_danger'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorWarning', 'Warning')}, () => this.colorField('color_warning'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorInfo', 'Info')}, () => this.colorField('color_info'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorLight', 'Light')}, () => this.colorField('color_light'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorDark', 'Dark')}, () => this.colorField('color_dark'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorMuted', 'Muted')}, () => this.colorField('color_muted'))),
            h(Col, {xs: 12, sm: 8, md: 6}, () => h(FormItem, {label: t('optionsTitleThemeColorWhite', 'White')}, () => this.colorField('color_white'))),
          ]),
          h(Divider, {orientation: 'left'}, () => t('optionsTitleThemeColorDomainTable', 'Color Domain')),
          h(
            Table,
            {
              dataSource: this.colorDomain,
              columns: this.domainColumns,
              pagination: false,
              size: 'small',
              rowKey: 'domain',
              style: {marginBottom: '16px'},
            },
            {
              bodyCell: ({column, record}) => {
                if (column.dataIndex === 'color') {
                  return h('div', {class: 'ot-color-cell'}, [
                    h('span', {class: 'ot-color-swatch', style: {background: record.color}}),
                    h('span', null, record.color),
                  ]);
                }
                if (column.dataIndex === 'actions') {
                  return h(
                    Button,
                    {danger: true, size: 'small', onClick: () => this.removeDomain(record.domain)},
                    () => t('optionsTitleThemeRemove', 'Remove'),
                  );
                }
                return record[column.dataIndex];
              },
            },
          ),
          h(Row, {gutter: [10, 10]}, () => [
            h(Col, {xs: 24, sm: 10}, () =>
              h(Input, {value: this.newDomain, 'onUpdate:value': (v) => { this.newDomain = v; }, placeholder: t('optionsTitleThemeDomain', 'Domain')}),
            ),
            h(Col, {xs: 24, sm: 10}, () => h(ColorInput, {modelValue: this.newColor, 'onUpdate:modelValue': (v) => { this.newColor = v; }})),
            h(Col, {xs: 24, sm: 4}, () => h(Button, {type: 'primary', onClick: this.addDomain}, () => t('optionsTitleThemeAdd', 'Add'))),
          ]),
        ]),
    });
  },
});
