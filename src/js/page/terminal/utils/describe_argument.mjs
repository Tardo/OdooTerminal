// @flow strict
// Copyright  Alexandre Díaz <dev@redneboa.es>
// License MIT (https://opensource.org/license/mit).

import i18n from 'i18next';
import {ARG} from '@tardo/trash/constants';

// Example of the syntax expected by an argument, so the user doesn't have to look it up
export function getArgumentFormat(type: number, name: string): string {
  if (type < 0 || (type & ARG.Flag) === ARG.Flag) {
    return '';
  }
  const is_list = (type & ARG.List) === ARG.List;
  if (name === 'domain') {
    return "[['id', '>', 5], ['name', 'ilike', 'abc']]";
  }
  if ((type & ARG.Dictionary) === ARG.Dictionary) {
    const dict = "{name: 'Hipcut', active: true, qty: 5}";
    return is_list ? `${dict} · [{name: 'A'}, {name: 'B'}]` : dict;
  }
  if (!is_list) {
    return '';
  }
  if ((type & ARG.Number) === ARG.Number) {
    return '5 · 5,8,15 · [5, 8, 15]';
  }
  if ((type & ARG.Any) === ARG.Any) {
    return "[5, 'text', [1, 2], {key: 'value'}]";
  }
  if (name === 'field') {
    return 'name · name,email · [name, email] · *';
  }
  return "a · a,b · [a, b] · ['a b', c]";
}

export default function describeArgument(type: number, name: string, description: string): string {
  // Descriptions may carry <br/> for the help view: this is plain text
  const res = `${ARG.getHumanType(type)}. ${description.replace(/<br\s*\/?>/gi, ' ')}`;
  const format = getArgumentFormat(type, name);
  if (!format) {
    return res;
  }
  return `${res} ⟶ ${i18n.t('terminal.assistant.format', 'Format')}: ${format}`;
}
