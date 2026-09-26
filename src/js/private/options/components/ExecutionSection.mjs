// @flow strict
// License MIT (https://opensource.org/license/mit).

import {h} from 'preact';
import {Card} from '../ui.mjs';
import {t} from '../i18n.mjs';

export default function ExecutionSection({settings, mutate}: any) {
  const limits = [
    ['execution_max_instructions', t('optionsExecutionInstructions', 'Maximum VM instructions'), 1],
    ['execution_max_source_length', t('optionsExecutionSource', 'Maximum source length (UTF-16 units)'), 1],
    ['execution_max_nesting_depth', t('optionsExecutionNesting', 'Maximum parser nesting depth'), 1],
    ['execution_max_collection_length', t('optionsExecutionCollection', 'Maximum collection length'), 1],
    ['execution_max_string_length', t('optionsExecutionString', 'Maximum string length (UTF-16 units)'), 1],
    ['execution_timeout', t('optionsExecutionTimeout', 'Execution timeout (ms; 0 disables)'), 0],
  ];
  return h(
    Card,
    {title: t('optionsTitleExecution', 'Execution control')},
    h(
      'p',
      {class: 'ot-hint'},
      t(
        'optionsExecutionHint',
        'Nested calls share the instruction budget. Timeout cancellation is cooperative: a host operation already in progress may finish before execution stops.',
      ),
    ),
    h(
      'div',
      {class: 'ot-form'},
      limits.map(([key, label, min]) =>
        h(
          'label',
          {class: 'ot-field', key},
          h('span', {class: 'ot-field-label'}, label),
          h('input', {
            class: 'ot-input',
            type: 'number',
            name: key,
            min,
            step: 1,
            max: key === 'execution_timeout' ? 2147483647 : Number.MAX_SAFE_INTEGER,
            value: settings[key],
            onChange: event => {
              const input = event.currentTarget;
              if (input.validity.valid && Number.isSafeInteger(input.valueAsNumber)) {
                mutate(s => {
                  s[key] = input.valueAsNumber;
                });
              } else {
                input.value = settings[key];
              }
            },
          }),
        ),
      ),
    ),
  );
}
