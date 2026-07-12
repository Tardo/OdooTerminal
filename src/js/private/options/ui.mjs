// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h, type VNode} from 'preact';
import {signal} from '@preact/signals';
import {t} from './i18n.mjs';

// Light Preact UI primitives. Props keep the Vue/AntD-style names
// ('onUpdate:value' / 'onUpdate:checked' / 'onUpdate:modelValue') so migrated
// section components barely change their h() call sites. Backed by native HTML
// + the .ot-* classes in options.html.

// ---- ColorInput (native color input bound to a #rrggbb string) ----
function toHexValue(v: mixed): string {
  if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
  return '#000000';
}
export function ColorInput(props: any): VNode {
  const onUpdate = props['onUpdate:modelValue'];
  return h('input', {
    type: 'color',
    class: 'ot-color-input',
    value: toHexValue(props.modelValue),
    onInput: (e: Event) => {
      if (e.target instanceof HTMLInputElement && onUpdate) onUpdate(e.target.value);
    },
  });
}

// ---- Card (section wrapper) ----
export function Card(props: any): VNode {
  const title = props.title;
  const extra = props.extra;
  return h('section', {class: `ot-card${props.class ? ` ${props.class}` : ''}`},
    title ? h('header', {class: 'ot-card-head'},
      h('h3', {class: 'ot-card-title'}, title),
      extra ? h('div', {class: 'ot-card-extra'}, extra) : null) : null,
    h('div', {class: 'ot-card-body'}, props.children));
}

// ---- Field (replaces AntD FormItem) ----
export function Field(props: any): VNode {
  return h('div', {class: 'ot-field', style: props.style},
    props.label ? h('label', {class: 'ot-field-label'}, props.label) : null,
    h('div', {class: 'ot-field-control'}, props.children));
}

// ---- Row / Col (flex grid, replaces AntD Row/Col) ----
export function Row(props: any): VNode {
  const st = {...(props.style || {})};
  const gutter = props.gutter;
  const g = Array.isArray(gutter) ? gutter[0] : gutter;
  st.display = 'flex';
  st.flexWrap = 'wrap';
  if (g) st.gap = `${g}px`;
  return h('div', {class: `ot-row${props.class ? ` ${props.class}` : ''}`, style: st}, props.children);
}
export function Col(props: any): VNode {
  const st = {...(props.style || {})};
  let flex = props.flex;
  // Normalize single tokens to valid CSS flex shorthand: '90px' -> '0 0 90px',
  // '2' -> '2 1 0'. Full shorthands ('1 1 160px') pass through unchanged.
  if (flex && typeof flex === 'string' && !/\s/.test(flex) && flex !== 'auto' && flex !== 'none') {
    flex = /^\d+(\.\d+)?$/.test(flex) ? `${flex} 1 0` : `0 0 ${flex}`;
  }
  st.flex = flex || '1 1 160px';
  st.minWidth = st.minWidth || '120px';
  return h('div', {class: `ot-col${props.class ? ` ${props.class}` : ''}`, style: st}, props.children);
}

// ---- Button ----
export function Button(props: any): VNode {
  const classes = ['ot-btn'];
  if (props.type) classes.push(`ot-btn-${props.type}`);
  if (props.danger) classes.push('ot-btn-danger');
  if (props.size) classes.push(`ot-btn-${props.size}`);
  if (props.class) classes.push(props.class);
  return h('button', {class: classes.join(' '), disabled: props.disabled || props.loading, onClick: props.onClick, style: props.style, title: props.title},
    props.loading ? h('span', {class: 'ot-spin-mini'}) : null,
    props.children);
}

// ---- Tag ----
export function Tag(props: any): VNode {
  const classes = ['ot-tag'];
  if (props.color) classes.push(`ot-tag-${props.color}`);
  if (props.class) classes.push(props.class);
  return h('span', {class: classes.join(' '), onClick: props.onClick, title: props.title}, props.children);
}

// ---- Divider ----
export function Divider(props: any): VNode {
  return h('div', {class: `ot-divider${props.orientation ? ` ot-divider-${props.orientation}` : ''}`},
    props.children !== undefined && props.children !== null ? h('span', {class: 'ot-divider-text'}, props.children) : null);
}

// ---- Spin ----
export function Spin(props: any): VNode {
  return h('span', {class: `ot-spin ot-spin-${props.size || 'default'}`});
}

// ---- Input ----
export function Input(props: any): VNode {
  const onUpdate = props['onUpdate:value'];
  const handler = (e: Event) => {
    const v = e.target instanceof HTMLInputElement ? e.target.value : '';
    if (onUpdate) onUpdate(v);
    if (props.onInput) props.onInput(v);
  };
  return h('input', {
    type: props.type || 'text',
    class: `ot-input${props.class ? ` ${props.class}` : ''}`,
    value: props.value,
    placeholder: props.placeholder,
    style: props.style,
    disabled: props.disabled,
    readonly: props.readonly,
    onInput: handler,
    onBlur: props.onBlur,
    onKeydown: props.onKeydown,
    onKeyup: props.onKeyup,
    ...props.passProps,
  });
}

// ---- Textarea ----
export function Textarea(props: any): VNode {
  const onUpdate = props['onUpdate:value'];
  const handler = (e: Event) => {
    const v = e.target instanceof HTMLTextAreaElement ? e.target.value : '';
    if (onUpdate) onUpdate(v);
    if (props.onInput) props.onInput(v);
  };
  return h('textarea', {
    class: `ot-textarea${props.class ? ` ${props.class}` : ''}`,
    value: props.value,
    rows: props.rows,
    placeholder: props.placeholder,
    style: props.style,
    disabled: props.disabled,
    onInput: handler,
    onBlur: props.onBlur,
    spellCheck: props.spellCheck,
  });
}

// ---- InputNumber ----
export function InputNumber(props: any): VNode {
  const onUpdate = props['onUpdate:value'];
  const handler = (e: Event) => {
    const v = e.target instanceof HTMLInputElement ? Number(e.target.value) : 0;
    if (onUpdate) onUpdate(v);
    if (props.onChange) props.onChange(v);
  };
  return h('input', {
    type: 'number',
    class: `ot-input-number${props.class ? ` ${props.class}` : ''}`,
    value: props.value,
    min: props.min,
    max: props.max,
    step: props.step,
    style: props.style,
    disabled: props.disabled,
    onInput: handler,
  });
}

// ---- Select (native) ----
export function Select(props: any): VNode {
  const onUpdate = props['onUpdate:value'];
  const handler = (e: Event) => {
    const v = e.target instanceof HTMLSelectElement ? e.target.value : '';
    if (onUpdate) onUpdate(v);
    if (props.onChange) props.onChange(v);
  };
  return h('select', {
    class: `ot-select${props.class ? ` ${props.class}` : ''}`,
    value: props.value,
    style: props.style,
    disabled: props.disabled,
    onChange: handler,
  },
  props.placeholder ? h('option', {value: '', disabled: true}, props.placeholder) : null,
  props.children);
}
export function SelectOption(props: any): VNode {
  return h('option', {value: props.value}, props.children);
}

// ---- Switch (toggle) ----
export function Switch(props: any): VNode {
  const onUpdate = props['onUpdate:checked'];
  const handler = (e: Event) => {
    const v = e.target instanceof HTMLInputElement ? e.target.checked : false;
    if (onUpdate) onUpdate(v);
    if (props.onChange) props.onChange(v);
  };
  return h('label', {class: `ot-switch${props.checked ? ' on' : ''}${props.disabled ? ' disabled' : ''}`},
    h('input', {type: 'checkbox', checked: props.checked, disabled: props.disabled, onChange: handler}),
    h('span', {class: 'ot-switch-track'}));
}

// ---- Checkbox ----
export function Checkbox(props: any): VNode {
  const onUpdate = props['onUpdate:checked'];
  const handler = (e: Event) => {
    const v = e.target instanceof HTMLInputElement ? e.target.checked : false;
    if (onUpdate) onUpdate(v);
    if (props.onChange) props.onChange(v);
  };
  return h('label', {class: 'ot-checkbox', style: props.style},
    h('input', {type: 'checkbox', checked: props.checked, disabled: props.disabled, onChange: handler}),
    props.children !== undefined && props.children !== null ? h('span', {class: 'ot-checkbox-label'}, props.children) : null);
}

// ---- Slider (range) ----
export function Slider(props: any): VNode {
  const onUpdate = props['onUpdate:value'];
  const handler = (e: Event) => {
    const v = e.target instanceof HTMLInputElement ? Number(e.target.value) : 0;
    if (onUpdate) onUpdate(v);
    if (props.onChange) props.onChange(v);
  };
  return h('input', {
    type: 'range',
    class: 'ot-slider',
    value: props.value,
    min: props.min,
    max: props.max,
    step: props.step,
    onInput: handler,
  });
}

// ---- Table (columns + dataSource + bodyCell), matches AntD bodyCell({column, record}) ----
export function Table(props: any): VNode {
  const columns = props.columns || [];
  const rows = props.dataSource || [];
  return h('div', {class: `ot-table-wrap${props.size ? ` ot-table-${props.size}` : ''}`, style: props.style},
    h('table', {class: 'ot-table'},
      h('thead', null, h('tr', null, columns.map((c: any) => h('th', {style: c.width ? {width: c.width} : null}, c.title)))),
      h('tbody', null,
        rows.length === 0
          ? h('tr', null, h('td', {class: 'ot-table-empty', colSpan: columns.length}, props.emptyText || t('optionsTableEmpty', 'No data')))
          : rows.map((row: any, i: number) =>
              h('tr', {key: props.rowKey ? row[props.rowKey] : i},
                columns.map((c: any) => {
                  const custom = props.bodyCell ? props.bodyCell({column: c, record: row, index: i}) : undefined;
                  return h('td', null, custom !== undefined ? custom : row[c.dataIndex]);
                }))))));
}

// ---- Modal + confirmDialog ----
export type ConfirmOptions = {
  title?: string,
  content?: string,
  okText?: string,
  cancelText?: string,
  okType?: 'default' | 'primary' | 'danger',
};

type ModalState = {open: boolean, opts: ConfirmOptions, resolve: ((boolean) => void) | null};
const modalState = signal<ModalState>({open: false, opts: {}, resolve: null});

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    modalState.value = {open: true, opts, resolve};
  });
}

export function ModalHost(): VNode {
  const state = modalState.value;
  if (!state.open) return h('div', {style: {display: 'none'}});
  const close = (val: boolean) => {
    if (state.resolve) state.resolve(val);
    modalState.value = {open: false, opts: {}, resolve: null};
  };
  return h('div', {class: 'ot-modal-mask'},
    h('div', {class: 'ot-modal'},
      state.opts.title ? h('div', {class: 'ot-modal-head'}, state.opts.title) : null,
      h('div', {class: 'ot-modal-body'}, state.opts.content || ''),
      h('div', {class: 'ot-modal-footer'},
        h(Button, {onClick: () => close(false)}, state.opts.cancelText || t('cancel', 'Cancel')),
        h(Button, {type: state.opts.okType === 'danger' ? 'danger' : 'primary', onClick: () => close(true)},
          state.opts.okText || t('ok', 'OK')))));
}

// ---- Toast (replaces AntD message) ----
type Toast = {id: number, type: string, text: string};
const toasts = signal<{list: Toast[]}>({list: []});
let toastSeq = 0;
function pushToast(type: string, text: string) {
  const id = ++toastSeq;
  toasts.value = {list: [...toasts.value.list, {id, type, text}]};
  setTimeout(() => {
    toasts.value = {list: toasts.value.list.filter((x) => x.id !== id)};
  }, 3000);
}
export const message = {
  success: (text: string) => pushToast('success', text),
  error: (text: string) => pushToast('error', text),
  info: (text: string) => pushToast('info', text),
  warning: (text: string) => pushToast('warning', text),
};
export function ToastHost(): VNode {
  const list = toasts.value.list;
  return h('div', {class: 'ot-toast-wrap'}, list.map((tg) => h('div', {class: `ot-toast ot-toast-${tg.type}`, key: tg.id}, tg.text)));
}
