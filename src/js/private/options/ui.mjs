// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {defineComponent, h} from 'vue';
import {Modal} from 'ant-design-vue';
import {t} from './i18n.mjs';

export type ConfirmOptions = {
  title?: string,
  content?: string,
  okText?: string,
  cancelText?: string,
  okType?: 'default' | 'primary' | 'dashed' | 'text' | 'link' | 'danger',
};

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      title: opts.title || t('confirm', 'Confirm'),
      content: opts.content || '',
      okText: opts.okText || t('ok', 'OK'),
      cancelText: opts.cancelText || t('cancel', 'Cancel'),
      okType: opts.okType || 'danger',
      onOk: () => resolve(true),
      onCancel: () => reject(new Error('cancelled')),
    });
  });
}

function toHexValue(v: mixed): string {
  if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) {
    return v;
  }
  return '#000000';
}

// Native color input bound to a #rrggbb string. Zero-dependency, always works,
// and stores plain hex so it stays compatible with SETTING_DEFAULTS.
export const ColorInput = defineComponent({
  name: 'ColorInput',
  props: {
    modelValue: {type: String, default: ''},
  },
  emits: ['update:modelValue'],
  setup(props, {emit}) {
    return () =>
      h('input', {
        type: 'color',
        class: 'ot-color-input',
        value: toHexValue(props.modelValue),
        onInput: (e: Event) => {
          if (e.target instanceof HTMLInputElement) {
            emit('update:modelValue', e.target.value);
          }
        },
      });
  },
});
