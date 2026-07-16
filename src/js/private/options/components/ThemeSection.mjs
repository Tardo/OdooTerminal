// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState} from 'preact/hooks';
import {Card, Field, Select, SelectOption, Slider, InputNumber, Input, Divider, Table, Button, Row, Col, ColorInput} from '../ui.mjs';
import {THEMES} from '@common/constants';
import {t} from '../i18n.mjs';

export default function ThemeSection({settings, mutate, loadThemeValues}: any) {
  const [newDomain, setNewDomain] = useState<string>('');
  const [newColor, setNewColor] = useState<string>('#ff0000');

  const themeLabels: {[string]: string} = {
    dark: t('optionsThemePresetDark', 'Dark'),
    light: t('optionsThemePresetLight', 'Light'),
    odoo: t('optionsThemePresetOdoo', 'Odoo'),
    matrix: t('optionsThemePresetMatrix', 'Matrix'),
    hacker: t('optionsThemePresetHacker', 'Hacker'),
    tech: t('optionsThemePresetTech', 'Tech'),
  };

  const onThemeChange = async (val: string) => {
    mutate((s: any) => {
      s.theme_preset = val;
    });
    if (!val) return;
    try {
      const themeValues = await loadThemeValues(val);
      mutate((s: any) => {
        Object.assign(s, themeValues);
      });
    } catch (err) {
      console.error('Failed to load theme:', err);
    }
  };

  const colorDomain = Object.entries(settings.colors_domain || {}).map(([domain, color]) => ({domain, color}));
  const domainColumns = [
    {title: t('optionsTitleThemeDomain', 'Domain'), dataIndex: 'domain'},
    {title: t('optionsTitleThemeColor', 'Color'), dataIndex: 'color'},
    {title: '', dataIndex: 'actions', width: 120},
  ];

  const addDomain = () => {
    if (!newDomain || !newColor) return;
    const d = newDomain;
    const c = newColor;
    mutate((s: any) => {
      s.colors_domain = {...(s.colors_domain || {}), [d]: c};
    });
    setNewDomain('');
  };
  const removeDomain = (domain: string) => {
    mutate((s: any) => {
      const domains = {...(s.colors_domain || {})};
      delete domains[domain];
      s.colors_domain = domains;
    });
  };
  const colorField = (key: string) =>
    h(ColorInput, {modelValue: settings[key], 'onUpdate:modelValue': (v: string) => mutate((s: any) => { s[key] = v; })});

  const colorFields: Array<[string, string]> = [
    ['color_primary', t('optionsTitleThemeColorPrimary', 'Primary')],
    ['color_secondary', t('optionsTitleThemeColorSecondary', 'Secondary')],
    ['color_success', t('optionsTitleThemeColorSuccess', 'Success')],
    ['color_danger', t('optionsTitleThemeColorDanger', 'Danger')],
    ['color_warning', t('optionsTitleThemeColorWarning', 'Warning')],
    ['color_info', t('optionsTitleThemeColorInfo', 'Info')],
    ['color_light', t('optionsTitleThemeColorLight', 'Light')],
    ['color_dark', t('optionsTitleThemeColorDark', 'Dark')],
    ['color_muted', t('optionsTitleThemeColorMuted', 'Muted')],
    ['color_white', t('optionsTitleThemeColorWhite', 'White')],
  ];

  return h(Card, {title: t('optionsTitleTheme', 'Theme'), class: 'ot-card'},
    h('div', {class: 'ot-form'},
      h(Row, {gutter: 16},
        h(Col, null,
          h(Field, {label: t('optionsTitleThemePreset', 'Theme Preset')},
            h(Select, {value: settings.theme_preset, onChange: onThemeChange, style: {width: '240px'}},
              h(SelectOption, {value: ''}, t('optionsTitleThemePresetCustom', 'Custom')),
              THEMES.map((item: any) => h(SelectOption, {key: item[0], value: item[0]}, themeLabels[item[0]] || item[1]))))),
        h(Col, null,
          h(Field, {label: t('optionsTitleThemeOpacity', 'Opacity')},
            h(Row, {gutter: 8},
              h(Col, {flex: 'auto'},
                h(Slider, {value: settings.opacity, 'onUpdate:value': (v: number) => mutate((s: any) => { s.opacity = v; }), min: 0, max: 100})),
              h(Col, {flex: '90px'},
                h(InputNumber, {value: settings.opacity, 'onUpdate:value': (v: number) => mutate((s: any) => { s.opacity = v; }), min: 0, max: 100, style: {width: '100%'}})))))),
      h(Row, {gutter: 16},
        h(Col, null,
          h(Field, {label: t('optionsTitleThemeFontSize', 'Font Size')},
            h(Select, {value: settings.fontsize, 'onUpdate:value': (v: string) => mutate((s: any) => { s.fontsize = v; }), style: {width: '240px'}},
              h(SelectOption, {value: 'small'}, t('optionsTitleThemeFontSizeSmall', 'Small')),
              h(SelectOption, {value: 'medium'}, t('optionsTitleThemeFontSizeMedium', 'Medium')),
              h(SelectOption, {value: 'large'}, t('optionsTitleThemeFontSizeLarge', 'Large'))))),
        h(Col, null,
          h(Field, {label: t('optionsTitleThemeFontSizeCA', 'Font Size (CA)')},
            h(Select, {value: settings.fontsize_ca, 'onUpdate:value': (v: string) => mutate((s: any) => { s.fontsize_ca = v; }), style: {width: '240px'}},
              h(SelectOption, {value: 'x-small'}, t('optionsTitleThemeFontSizeXSmall', 'X-Small')),
              h(SelectOption, {value: 'small'}, t('optionsTitleThemeFontSizeSmall', 'Small')),
              h(SelectOption, {value: 'medium'}, t('optionsTitleThemeFontSizeMedium', 'Medium')),
              h(SelectOption, {value: 'large'}, t('optionsTitleThemeFontSizeLarge', 'Large')))))),
      h(Field, {label: t('optionsTitleThemeFontFamily', 'Font Family')},
        h(Input, {value: settings.fontfamily, 'onUpdate:value': (v: string) => mutate((s: any) => { s.fontfamily = v; }), placeholder: "'Lucida Console', Monaco, monospace"})),
      h(Divider, {orientation: 'left'}, t('optionsTitleThemeColors', 'Colors')),
      h(Row, {gutter: [16, 8]},
        colorFields.map(([key, label]) => h(Col, {key, flex: '1 1 120px'}, h(Field, {label}, colorField(key))))),
      h(Divider, {orientation: 'left'}, t('optionsTitleThemeColorDomainTable', 'Color Domain')),
      h(Table, {
        dataSource: colorDomain,
        columns: domainColumns,
        size: 'small',
        rowKey: 'domain',
        style: {marginBottom: '16px'},
        bodyCell: ({column, record}: any) => {
          if (column.dataIndex === 'color') {
            return h('div', {class: 'ot-color-cell'},
              h('span', {class: 'ot-color-swatch', style: {background: record.color}}),
              h('span', null, record.color));
          }
          if (column.dataIndex === 'actions') {
            return h(Button, {danger: true, size: 'small', onClick: () => removeDomain(record.domain)}, t('optionsTitleThemeRemove', 'Remove'));
          }
          return record[column.dataIndex];
        },
      }),
      h(Row, {gutter: [10, 10]},
        h(Col, {flex: '1 1 200px'},
          h(Input, {value: newDomain, 'onUpdate:value': (v: string) => setNewDomain(v), placeholder: t('optionsTitleThemeDomain', 'Domain')})),
        h(Col, {flex: '0 0 auto'},
          h(ColorInput, {modelValue: newColor, 'onUpdate:modelValue': (v: string) => setNewColor(v)})),
        h(Col, {flex: '0 0 auto'},
          h(Button, {type: 'primary', onClick: addDomain}, t('optionsTitleThemeAdd', 'Add'))))));
}
