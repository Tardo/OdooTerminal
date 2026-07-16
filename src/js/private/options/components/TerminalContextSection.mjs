// @flow strict
// Copyright  Taois <taoist.han@vertechs.com>
// License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import {h} from 'preact';
import {useState, useEffect, useRef} from 'preact/hooks';
import {Card, Textarea, message} from '../ui.mjs';
import {t} from '../i18n.mjs';

export default function TerminalContextSection({settings, mutate}: any) {
  const [rawJson, setRawJson] = useState<string>(() => JSON.stringify(settings.term_context || {}, null, 4));
  // skipSync prevents the external-sync effect from clobbering the field while
  // the user is typing — only reset/external changes should reformat the box.
  const skipSync = useRef<boolean>(false);

  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    setRawJson(JSON.stringify(settings.term_context || {}, null, 4));
  }, [settings.term_context]);

  const onInput = (val: string) => {
    skipSync.current = true;
    setRawJson(val);
    try {
      const parsed = JSON.parse(val);
      mutate((s: any) => {
        s.term_context = parsed;
      });
    } catch (_e) {
      // ignore invalid JSON while typing
    }
  };

  const onBlur = () => {
    try {
      const parsed = JSON.parse(rawJson);
      mutate((s: any) => {
        s.term_context = parsed;
      });
      setRawJson(JSON.stringify(parsed, null, 4));
    } catch (_e) {
      message.error(t('optionsTermContextInvalidJson', 'Invalid JSON format'));
    }
  };

  return h(Card, {title: t('optionsTitleTerminalContext', 'Terminal Context'), class: 'ot-card'},
    h('p', {class: 'ot-hint'}, t('optionsTitleTerminalContextDescription', 'This context will be merged with the "normal" context on terminal operations. In json format.')),
    h(Textarea, {
      value: rawJson,
      'onUpdate:value': onInput,
      onBlur,
      rows: 8,
      placeholder: '{"active_test": false}',
      style: {fontFamily: 'monospace'},
    }));
}
